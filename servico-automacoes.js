import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from '../discord/compat.js';
import { payloadMensagemAutomatica } from './paineis-mensagens.js';
import {
  enviarAvisoCanal,
  payloadCanalDestrancado,
  payloadCanalTrancado,
  payloadLimpezaAutomatica,
} from './mensagens-sistema.js';

export async function enviarMensagemAutomatica(guild, item) {
  const channel = await guild.channels.fetch(item.channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    return { ok: false, error: 'Canal não encontrado ou sem suporte a mensagens.' };
  }

  const previousMessageId = item.lastMessageId;
  const previousChannelId = item.lastChannelId || item.channelId;
  const message = await channel.send(payloadMensagemAutomatica(item)).catch((error) => ({ error }));
  if (message?.error) return { ok: false, error: message.error.message };

  // Só remove a anterior depois que a nova foi enviada com sucesso.
  if (previousMessageId && previousMessageId !== message.id) {
    const previousChannel = previousChannelId === channel.id
      ? channel
      : await guild.channels.fetch(previousChannelId).catch(() => null);
    if (previousChannel?.messages?.delete) {
      await previousChannel.messages.delete(previousMessageId).catch(() => null);
    }
  }

  item.lastSentAt = Date.now();
  item.lastMessageId = message.id;
  item.lastChannelId = channel.id;
  item.nextRunAt = Date.now() + Math.max(1, Number(item.intervalMinutes) || 60) * 60_000;
  return { ok: true, message };
}

/**
 * Limpa mensagens e envia aviso no canal (visual do print).
 * @param {{ notificar?: boolean }} opts
 */
export async function executarLimpeza(guild, regra, opts = {}) {
  const notificar = opts.notificar !== false;
  const channel = await guild.channels.fetch(regra.channelId).catch(() => null);
  if (!channel?.isTextBased() || !channel.messages?.fetch) {
    return { ok: false, removidas: 0, error: 'Canal não encontrado ou incompatível.' };
  }

  const collection = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!collection) {
    return { ok: false, removidas: 0, error: 'Não foi possível buscar as mensagens.' };
  }

  const limiteData = Date.now() - 13.8 * 24 * 60 * 60 * 1000;
  const candidatas = collection.filter((message) => {
    if (message.createdTimestamp < limiteData) return false;
    if (regra.preservePinned && message.pinned) return false;
    if (regra.ignoreRoleId && message.member?.roles?.cache?.has(regra.ignoreRoleId)) return false;
    return !message.system;
  });

  let removidas = 0;
  if (candidatas.size) {
    const deleted = await channel.bulkDelete(candidatas, true).catch(() => null);
    if (!deleted) {
      return {
        ok: false,
        removidas: 0,
        error: 'O Discord recusou a limpeza. Verifique as permissões.',
      };
    }
    removidas = deleted.size;
  }

  if (notificar) {
    await enviarAvisoCanal(channel, payloadLimpezaAutomatica(removidas));
  }

  return { ok: true, removidas, channel };
}

/**
 * Tranca/destranca o canal e envia mensagem de sistema (print).
 * @param {boolean} trancado
 * @param {{ notificar?: boolean }} opts
 */
export async function definirCanalTrancado(guild, channelId, trancado, opts = {}) {
  const notificar = opts.notificar !== false;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.permissionOverwrites?.edit) return false;

  await channel.permissionOverwrites
    .edit(guild.roles.everyone, { SendMessages: trancado ? false : null })
    .catch(() => null);

  if (notificar && channel.isTextBased?.()) {
    await enviarAvisoCanal(
      channel,
      trancado ? payloadCanalTrancado(opts.unlockTimestamp) : payloadCanalDestrancado(),
    );
  }

  return true;
}

export function payloadNotificacaoRestock(guild, config, product, field, addedQuantity, agora = Date.now()) {
  const mention =
    config.mention === 'everyone'
      ? '@everyone'
      : config.mention === 'role' && config.role
        ? `<@&${config.role}>`
        : null;

  const total = field.infinite?.enabled
    ? 'Infinito'
    : Number(field.stock?.length || 0) + Number(field.ghostStock?.quantity || 0);

  const timestamp = Math.floor(agora / 1000);
  const sale = product.salesMessage;
  const saleUrl = sale?.channelId && sale?.messageId
    ? `https://discord.com/channels/${guild.id}/${sale.channelId}/${sale.messageId}`
    : null;

  return {
    content: [
      `## RESTOCK! O produto ${product.name} acabou de receber novos itens!`,
      '',
      `**▣ Campo:** \`${field.name}\``,
      `**▱ Adicionados:** \`${addedQuantity}x\``,
      `**✓ Estoque total:** \`${total}x\``,
      `**◷ Data:** <t:${timestamp}:f> (<t:${timestamp}:R>)`,
      mention ? `\n${mention}` : '',
    ].filter(Boolean).join('\n'),
    allowedMentions: mention
      ? {
          parse: config.mention === 'everyone' ? ['everyone'] : [],
          roles: config.role ? [config.role] : [],
        }
      : { parse: [] },
    components: saleUrl ? [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(saleUrl).setLabel('Comprar Agora'),
    )] : [],
  };
}

export async function notificarRestock(guild, gs, product, field, addedQuantity) {
  const config = gs.automations?.restock;
  if (!config?.enabled || !config.channel) return false;
  const channel = await guild.channels.fetch(config.channel).catch(() => null);
  if (!channel?.isTextBased()) return false;

  const payload = payloadNotificacaoRestock(guild, config, product, field, addedQuantity);

  const sent = await channel.send(payload).catch(() => null);
  if (!sent) return false;
  config.sentCount = Number(config.sentCount || 0) + 1;
  return true;
}

function horaSaoPaulo(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function proximaExecucaoSaoPaulo(horario, agora = Date.now()) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario || '')) return null;
  const data = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(agora));
  let timestamp = new Date(`${data}T${horario}:00-03:00`).getTime();
  if (timestamp <= agora) timestamp += 24 * 60 * 60 * 1000;
  return timestamp;
}

export function iniciarAgendadorAutomacoes(client, { state, saveState }) {
  let executando = false;

  const tick = async () => {
    if (executando) return;
    executando = true;
    let alterado = false;
    const agora = Date.now();
    const horaAtual = horaSaoPaulo();

    try {
      for (const [guildId, gs] of Object.entries(state.guilds || {})) {
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) continue;

        if (gs.automations?.messages?.enabled) {
          for (const item of gs.automations.messages.items || []) {
            if (Number(item.nextRunAt || 0) > agora) continue;
            const result = await enviarMensagemAutomatica(guild, item);
            if (result.ok) alterado = true;
          }
        }

        if (gs.automations?.cleanup?.enabled) {
          for (const regra of gs.automations.cleanup.rules || []) {
            for (const agenda of regra.schedules || []) {
              const chaveHoje = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Sao_Paulo',
              }).format(new Date());

              // Limpeza no horário (+ aviso no canal)
              if (agenda.time === horaAtual && agenda.lastRunDate !== chaveHoje) {
                const result = await executarLimpeza(guild, regra, { notificar: true });
                agenda.lastRunDate = chaveHoje;
                // Tranca depois da limpeza (+ aviso)
                if (result.ok && agenda.lockAfter) {
                  await definirCanalTrancado(guild, regra.channelId, true, {
                    notificar: true,
                    unlockTimestamp: proximaExecucaoSaoPaulo(agenda.unlockAt, agora),
                  });
                }
                alterado = true;
              }

              // Destranque no horário (+ aviso)
              if (agenda.unlockAt === horaAtual && agenda.lastUnlockDate !== chaveHoje) {
                await definirCanalTrancado(guild, regra.channelId, false, {
                  notificar: true,
                });
                agenda.lastUnlockDate = chaveHoje;
                alterado = true;
              }
            }
          }
        }

        if (gs.automations?.lock?.enabled) {
          const chaveHoje = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Sao_Paulo',
          }).format(new Date());

          for (const regra of gs.automations.lock.rules || []) {
            if (regra.lockAt === horaAtual && regra.lastLockDate !== chaveHoje) {
              await definirCanalTrancado(guild, regra.channelId, true, {
                notificar: true,
                unlockTimestamp: proximaExecucaoSaoPaulo(regra.unlockAt, agora),
              });
              regra.lastLockDate = chaveHoje;
              alterado = true;
            }
            if (regra.unlockAt === horaAtual && regra.lastUnlockDate !== chaveHoje) {
              await definirCanalTrancado(guild, regra.channelId, false, {
                notificar: true,
              });
              regra.lastUnlockDate = chaveHoje;
              alterado = true;
            }
          }
        }
      }
      if (alterado) await saveState();
    } finally {
      executando = false;
    }
  };

  const timer = setInterval(tick, 30_000);
  timer.unref?.();
  void tick();
  return () => clearInterval(timer);
}
