import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from '../discord/compat.js';

const COR = { entrada: 0x3ba55d, saida: 0xed4245, apagada: 0xed4245, editada: 0xfee75c };
const entradasVoz = new Map();

function cortar(texto, limite = 1800) {
  const valor = String(texto || '').trim();
  return valor ? valor.slice(0, limite) : '*Sem conteúdo de texto*';
}

function dataCurta(timestamp = Date.now()) {
  return `<t:${Math.floor(timestamp / 1000)}:f>`;
}

function botaoLink(url, label) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url).setLabel(label),
  );
}

export function embedEntradaMembro(member, totalMembros = member.guild.memberCount) {
  const dias = Math.max(0, Math.floor((Date.now() - member.user.createdTimestamp) / 86_400_000));
  return new EmbedBuilder()
    .setColor(COR.entrada)
    .setAuthor({ name: 'Novo membro!', iconURL: member.user.displayAvatarURL?.({ size: 64 }) })
    .setDescription([
      `${member} **Entrou no servidor!**`,
      '',
      `• **Membro n.º:** \`${totalMembros}\``,
      `• A conta possui **\`${dias}\` dia(s)** de criação!`,
    ].join('\n'))
    .setThumbnail(member.user.displayAvatarURL?.({ size: 256 }))
    .setTimestamp();
}

export function embedSaidaMembro(member) {
  const entrou = member.joinedTimestamp || Date.now();
  const permanencia = Math.max(0, Date.now() - entrou);
  const horas = Math.floor(permanencia / 3_600_000);
  const minutos = Math.floor((permanencia % 3_600_000) / 60_000);
  const cargos = member.roles?.cache
    ? [...member.roles.cache.values()].filter((cargo) => cargo.id !== member.guild.id).map(String).join(', ')
    : '';
  return new EmbedBuilder()
    .setColor(COR.saida)
    .setAuthor({ name: 'Membro saiu!', iconURL: member.user.displayAvatarURL?.({ size: 64 }) })
    .setDescription([
      `${member} **saiu do servidor!**`,
      '',
      `• **Membros atuais:** \`${member.guild.memberCount}\``,
      `• **Tempo no servidor:** \`${horas} hora(s) e ${minutos} minuto(s)\``,
      `• **Cargos:** ${cargos || '`Nenhum`'}`,
      `• **Data de Entrada no Servidor:** ${dataCurta(entrou)}`,
    ].join('\n'))
    .setThumbnail(member.user.displayAvatarURL?.({ size: 256 }))
    .setTimestamp();
}

export function payloadMensagemApagada(message) {
  const urlCanal = `https://discord.com/channels/${message.guild.id}/${message.channelId}`;
  const embed = new EmbedBuilder()
    .setColor(COR.apagada)
    .setAuthor({ name: 'Mensagem apagada', iconURL: message.author?.displayAvatarURL?.({ size: 64 }) })
    .setDescription([
      `**Autor:** ${message.author || '`Desconhecido`'}${message.author?.tag ? ` (\`${message.author.tag}\`)` : ''}`,
      `**Canal:** ${message.channel || `<#${message.channelId}>`}`,
      '',
      '• **Conteúdo:**',
      cortar(message.content),
      '',
      `Hora da exclusão • ${dataCurta()}`,
    ].join('\n'));
  const anexos = [...(message.attachments?.values?.() || [])].map((item) => item.url);
  if (anexos.length) embed.addFields({ name: 'Anexos', value: anexos.join('\n').slice(0, 1024) });
  return { embeds: [embed], components: [botaoLink(urlCanal, 'Ir ao Canal')] };
}

export function payloadMensagemEditada(oldMessage, newMessage) {
  const urlMensagem = newMessage.url || `https://discord.com/channels/${newMessage.guild.id}/${newMessage.channelId}/${newMessage.id}`;
  const urlCanal = `https://discord.com/channels/${newMessage.guild.id}/${newMessage.channelId}`;
  return {
    embeds: [new EmbedBuilder()
      .setColor(COR.editada)
      .setAuthor({ name: 'Mensagem editada', iconURL: newMessage.author?.displayAvatarURL?.({ size: 64 }) })
      .setDescription([
        `**Canal:** ${newMessage.channel || `<#${newMessage.channelId}>`}`,
        `**Autor:** ${newMessage.author || '`Desconhecido`'}${newMessage.author?.tag ? ` (\`${newMessage.author.tag}\`)` : ''}`,
        '',
        '• **Antes:**',
        cortar(oldMessage.content),
        '',
        '• **Depois:**',
        cortar(newMessage.content),
        '',
        `Hora da edição • ${dataCurta()}`,
      ].join('\n'))],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(urlMensagem).setLabel('Ver Mensagem Editada'),
        new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(urlCanal).setLabel('Ir ao Canal'),
      ),
    ],
  };
}

export function embedVoz(member, channel, entrou, duracaoMs = 0) {
  const minutos = Math.floor(duracaoMs / 60_000);
  return new EmbedBuilder()
    .setColor(entrou ? COR.entrada : COR.saida)
    .setAuthor({ name: member.user.globalName || member.user.username, iconURL: member.user.displayAvatarURL?.({ size: 64 }) })
    .setDescription([
      `🔵 **${entrou ? 'Entrou no canal' : 'Saiu do canal'}** ${channel}`,
      !entrou ? `🕘 **${minutos} min**` : '',
    ].filter(Boolean).join('\n'))
    .setTimestamp();
}

export function registrarLogsServidor(client, { guildState, sendConfiguredLog }) {
  client.on('guildMemberAdd', async (member) => {
    const gs = guildState(member.guild.id);
    await sendConfiguredLog(member.guild, gs.channels.entries, { embeds: [embedEntradaMembro(member)] });
  });

  client.on('guildMemberRemove', async (member) => {
    const gs = guildState(member.guild.id);
    await sendConfiguredLog(member.guild, gs.channels.exits, { embeds: [embedSaidaMembro(member)] });
  });

  client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot) return;
    const gs = guildState(message.guild.id);
    await sendConfiguredLog(message.guild, gs.channels.messages, payloadMensagemApagada(message));
  });

  client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!newMessage.guild || newMessage.author?.bot || oldMessage.content === newMessage.content) return;
    const gs = guildState(newMessage.guild.id);
    await sendConfiguredLog(newMessage.guild, gs.channels.messages, payloadMensagemEditada(oldMessage, newMessage));
  });

  client.on('voiceStateUpdate', async (oldState, newState) => {
    if (oldState.channelId === newState.channelId) return;
    const member = newState.member || oldState.member;
    const guild = newState.guild || oldState.guild;
    const gs = guildState(guild.id);
    if (oldState.channelId) {
      const inicio = entradasVoz.get(`${guild.id}:${member.id}`) || Date.now();
      entradasVoz.delete(`${guild.id}:${member.id}`);
      await sendConfiguredLog(guild, gs.channels.voiceTraffic, { embeds: [embedVoz(member, oldState.channel, false, Date.now() - inicio)] });
    }
    if (newState.channelId) {
      entradasVoz.set(`${guild.id}:${member.id}`, Date.now());
      await sendConfiguredLog(guild, gs.channels.voiceTraffic, { embeds: [embedVoz(member, newState.channel, true)] });
    }
  });
}
