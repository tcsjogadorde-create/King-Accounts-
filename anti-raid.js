import { AuditLogEvent, EmbedBuilder, PermissionFlagsBits } from '../discord/compat.js';

const entradasRecentes = new Map();
const alteracoesRecentes = new Map();
const mensagensRecentes = new Map();
const ultimosAlertas = new Map();
const COOLDOWN_ALERTA_MS = 15_000;
const JANELA_LIMPEZA_MS = 120_000;
let eventosDesdeLimpeza = 0;

function manterJanela(itens, janelaMs, agora) {
  const limite = agora - janelaMs;
  return itens.filter((item) => item >= limite);
}

function semPrivilegiosDeExcecao(member, gs) {
  if (member?.permissions?.has?.(PermissionFlagsBits.Administrator)) return false;
  if (member?.permissions?.has?.(PermissionFlagsBits.ManageGuild)) return false;
  if (member?.permissions?.has?.(PermissionFlagsBits.ManageMessages)) return false;
  const trustedRoles = [gs.roles?.staff, gs.roles?.manager].filter(Boolean);
  return !trustedRoles.some((roleId) => member?.roles?.cache?.has(roleId));
}

function limparMapasPeriodicamente(agora) {
  eventosDesdeLimpeza += 1;
  if (eventosDesdeLimpeza < 500) return;
  eventosDesdeLimpeza = 0;

  for (const [key, timestamps] of mensagensRecentes) {
    const atuais = manterJanela(timestamps, JANELA_LIMPEZA_MS, agora);
    if (atuais.length) mensagensRecentes.set(key, atuais);
    else mensagensRecentes.delete(key);
  }
  for (const [key, timestamps] of alteracoesRecentes) {
    const atuais = manterJanela(timestamps, JANELA_LIMPEZA_MS, agora);
    if (atuais.length) alteracoesRecentes.set(key, atuais);
    else alteracoesRecentes.delete(key);
  }
  for (const [key, timestamp] of ultimosAlertas) {
    if (agora - timestamp > JANELA_LIMPEZA_MS) ultimosAlertas.delete(key);
  }
}

function canalDeLogs(gs) {
  return gs.protect?.logChannel
    || gs.protect?.antiInvite?.logChannel
    || gs.protect?.selfBot?.logChannel
    || gs.channels?.system
    || null;
}

async function alertarEquipe(guild, gs, sendConfiguredLog, titulo, descricao, campos = []) {
  const channelId = canalDeLogs(gs);
  if (!channelId) return null;

  const roles = [...new Set([gs.roles?.manager, gs.roles?.staff].filter(Boolean))];
  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle(`🛡️ ${titulo}`)
    .setDescription(String(descricao || '').slice(0, 4000))
    .setTimestamp();
  if (campos.length) {
    embed.addFields(campos.slice(0, 10).map(({ name, value }) => ({
      name: String(name).slice(0, 256),
      value: String(value).slice(0, 1024),
      inline: true,
    })));
  }

  return sendConfiguredLog(guild, channelId, {
    ...(roles.length
      ? {
          content: roles.map((roleId) => `<@&${roleId}>`).join(' '),
          allowedMentions: { roles },
        }
      : {}),
    embeds: [embed],
  });
}

function podeAlertar(key, agora, cooldownMs = COOLDOWN_ALERTA_MS) {
  const anterior = ultimosAlertas.get(key) || 0;
  if (agora - anterior < cooldownMs) return false;
  ultimosAlertas.set(key, agora);
  return true;
}

async function aplicarAcaoDeEntrada(member, punishment) {
  const acao = String(punishment || '').toLowerCase();
  try {
    if (acao === 'kick') {
      await member.kick('zenProtect: limite de entradas suspeitas excedido');
      return 'Kick aplicado ao membro que atingiu o limite';
    }
    if (acao === 'timeout') {
      await member.timeout(5 * 60_000, 'zenProtect: limite de entradas suspeitas excedido');
      return 'Timeout de 5 minutos aplicado ao membro que atingiu o limite';
    }
  } catch (error) {
    console.warn('[zenProtect] Não foi possível aplicar a ação configurada:', error?.code || 'erro');
    return 'Ação configurada não aplicada; verifique as permissões do bot';
  }
  return 'Somente registro e alerta';
}

async function auditarAutor(guild, auditType, targetId) {
  if (!auditType || !guild?.fetchAuditLogs) return null;
  const logs = await guild.fetchAuditLogs({ type: auditType, limit: 6 }).catch(() => null);
  const recente = logs?.entries?.find((entry) =>
    Date.now() - entry.createdTimestamp < 20_000
    && (!targetId || entry.target?.id === targetId));
  return recente?.executor || null;
}

function configurarEntradas(client, guildState, sendConfiguredLog) {
  client.on('guildMemberAdd', async (member) => {
    const gs = guildState(member.guild.id);
    if (!gs.protect?.antiraid) return;

    const agora = Date.now();
    const janelaMs = Math.max(3, Number(gs.protect.raidWindowSeconds) || 10) * 1000;
    const membros = manterJanela(entradasRecentes.get(member.guild.id) || [], janelaMs, agora);
    membros.push(agora);
    entradasRecentes.set(member.guild.id, membros);
    limparMapasPeriodicamente(agora);

    const limite = Math.max(2, Number(gs.protect.raidLimit) || 8);
    const chaveAlerta = `join:${member.guild.id}`;
    if (membros.length < limite || !podeAlertar(chaveAlerta, agora, janelaMs)) return;

    const acao = await aplicarAcaoDeEntrada(member, gs.protect.raidPunishment);
    await alertarEquipe(
      member.guild,
      gs,
      sendConfiguredLog,
      'Pico de entradas detectado',
      `O limite de entradas foi excedido. A ação configurada foi: **${acao}**.`,
      [
        { name: 'Entradas', value: `${membros.length} em ${Math.ceil(janelaMs / 1000)}s` },
        { name: 'Limite', value: String(limite) },
        { name: 'Membro mais recente', value: `${member.user.tag || member.id} (${member.id})` },
      ],
    );
  });
}

function configurarMensagens(client, guildState, sendConfiguredLog) {
  client.on('messageCreate', async (message) => {
    if (!message.guild || !message.member || message.author?.bot || message.webhookId) return;
    const gs = guildState(message.guild.id);
    const config = gs.protect;
    if (!semPrivilegiosDeExcecao(message.member, gs)) return;

    const agora = Date.now();
    limparMapasPeriodicamente(agora);
    const cooldownKey = `message:${message.guild.id}:${message.author.id}`;

    if (config.antiSpam) {
      const janelaMs = Math.max(3, Number(config.antiSpamWindowSeconds) || 8) * 1000;
      const key = `${message.guild.id}:${message.author.id}`;
      const mensagens = manterJanela(mensagensRecentes.get(key) || [], janelaMs, agora);
      mensagens.push(agora);
      mensagensRecentes.set(key, mensagens);

      if (mensagens.length >= Math.max(2, Number(config.antiSpamLimit) || 5)
        && podeAlertar(`spam:${cooldownKey}`, agora)) {
        await message.delete().catch(() => null);
        const minutos = Math.max(0, Number(config.antiSpamTimeoutMinutes) || 0);
        if (minutos) {
          await message.member.timeout(
            Math.min(1440, minutos) * 60_000,
            'zenProtect: flood de mensagens',
          ).catch(() => null);
        }
        await alertarEquipe(
          message.guild,
          gs,
          sendConfiguredLog,
          'Flood de mensagens detectado',
          `A mensagem foi removida${minutos ? ` e o membro recebeu timeout de ${minutos} min` : ''}.`,
          [
            { name: 'Membro', value: `${message.author.tag || message.author.id} (${message.author.id})` },
            { name: 'Canal', value: `<#${message.channelId}>` },
            { name: 'Mensagens na janela', value: `${mensagens.length} em ${Math.ceil(janelaMs / 1000)}s` },
          ],
        );
      }
    }

    if (!config.antiMassMention) return;
    const mentionCount = message.mentions.users.size
      + message.mentions.roles.size
      + (message.mentions.everyone ? 1 : 0);
    if (mentionCount < Math.max(2, Number(config.mentionLimit) || 5)
      || !podeAlertar(`mentions:${cooldownKey}`, agora)) return;

    await message.delete().catch(() => null);
    const minutos = Math.max(0, Number(config.mentionTimeoutMinutes) || 0);
    if (minutos) {
      await message.member.timeout(
        Math.min(1440, minutos) * 60_000,
        'zenProtect: excesso de menções',
      ).catch(() => null);
    }
    await alertarEquipe(
      message.guild,
      gs,
      sendConfiguredLog,
      'Excesso de menções detectado',
      `A mensagem foi removida${minutos ? ` e o membro recebeu timeout de ${minutos} min` : ''}.`,
      [
        { name: 'Membro', value: `${message.author.tag || message.author.id} (${message.author.id})` },
        { name: 'Canal', value: `<#${message.channelId}>` },
        { name: 'Menções', value: String(mentionCount) },
      ],
    );
  });
}

function configurarAlteracoesDeServidor(client, guildState, sendConfiguredLog) {
  const tipos = [
    { evento: 'channelCreate', titulo: 'criação de canais', auditoria: AuditLogEvent.ChannelCreate },
    { evento: 'channelDelete', titulo: 'exclusão de canais', auditoria: AuditLogEvent.ChannelDelete },
    { evento: 'roleCreate', titulo: 'criação de cargos', auditoria: AuditLogEvent.RoleCreate },
    { evento: 'roleDelete', titulo: 'exclusão de cargos', auditoria: AuditLogEvent.RoleDelete },
  ];

  for (const tipo of tipos) {
    client.on(tipo.evento, async (objeto) => {
      const guild = objeto.guild;
      if (!guild) return;
      const gs = guildState(guild.id);
      if (!gs.protect?.antiraid) return;

      const agora = Date.now();
      const janelaMs = Math.max(5, Number(gs.protect.auditWindowSeconds) || 15) * 1000;
      const key = `${guild.id}:${tipo.evento}`;
      const eventos = manterJanela(alteracoesRecentes.get(key) || [], janelaMs, agora);
      eventos.push(agora);
      alteracoesRecentes.set(key, eventos);
      limparMapasPeriodicamente(agora);

      const limite = Math.max(2, Number(gs.protect.auditLimit) || 4);
      if (eventos.length < limite || !podeAlertar(`audit:${key}`, agora, janelaMs)) return;

      const actor = await auditarAutor(guild, tipo.auditoria, objeto.id);
      await alertarEquipe(
        guild,
        gs,
        sendConfiguredLog,
        'Alterações em massa detectadas',
        `Pico de ${tipo.titulo} detectado. O bot registrou o evento e notificou a equipe; nenhuma alteração foi revertida automaticamente.`,
        [
          { name: 'Tipo', value: tipo.titulo },
          { name: 'Quantidade', value: `${eventos.length} em ${Math.ceil(janelaMs / 1000)}s` },
          { name: 'Limite', value: String(limite) },
          { name: 'Autor no audit log', value: actor ? `${actor.tag || actor.username} (${actor.id})` : 'Não disponível (permissão ou registro do Discord)' },
          { name: 'Canal/cargo mais recente', value: `${objeto.name || 'Sem nome'} (${objeto.id})` },
        ],
      );
    });
  }
}

export function registrarAntiRaid(client, { guildState, sendConfiguredLog }) {
  configurarEntradas(client, guildState, sendConfiguredLog);
  configurarMensagens(client, guildState, sendConfiguredLog);
  configurarAlteracoesDeServidor(client, guildState, sendConfiguredLog);
}