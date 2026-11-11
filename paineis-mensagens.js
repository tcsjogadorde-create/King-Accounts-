import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from '../discord/compat.js';
import { button, embed, id } from '../discord/componentes.js';
function resumoMensagem(item) {
  return [
    `**# Canal**\n${item.channelId ? `<#${item.channelId}>` : '`Não definido`'}`,
    `**▣ Tipo**\n\`${item.mode === 'embed' ? 'Embed' : 'Mensagem'}\``,
    `**Cor**\n\`${item.mode === 'embed' ? item.color || '#E60000' : 'N/A'}\``,
    `**◷ Intervalo**\n\`${item.intervalMinutes} minutos\``,
    `**◷ Próximo Envio**\n${item.nextRunAt ? `<t:${Math.floor(item.nextRunAt / 1000)}:F>\n(<t:${Math.floor(item.nextRunAt / 1000)}:R>)` : '`Aguardando ativação`'}`,
    `**📦 Último Envio**\n${item.lastSentAt ? `<t:${Math.floor(item.lastSentAt / 1000)}:R>` : '`Nunca enviada`'}`,
    `\n**▣ Conteúdo**\n\`\`\`\n${item.content.slice(0, 850)}\n\`\`\``,
  ].join('\n');
}

export function painelMensagensAutomaticas(guild, gs) {
  const config = gs.automations.messages;
  const itens = config.items || [];
  const listagem = itens.length
    ? `\n\n**▣ Mensagens Configuradas**\n${itens.slice(0, 8).map((item) => {
      const proximo = item.nextRunAt ? `<t:${Math.floor(item.nextRunAt / 1000)}:R>` : '`aguardando ativação`';
      const preview = String(item.content || '').replace(/\n+/g, ' ').slice(0, 58);
      return [
        `<#${item.channelId}> · \`${item.intervalMinutes} minutos\` · ◷ ${proximo}`,
        `• ${preview}${String(item.content || '').length > 58 ? '...' : ''}`,
      ].join('\n');
    }).join('\n\n')}`
    : '';

  const painel = embed(
    'zenSallers',
    [
      '**▣ Sistema de Mensagens Automáticas**',
      '',
      'Gerencie mensagens automáticas que serão enviadas regularmente nos canais configurados.',
      '',
      '◉ **Cada mensagem pode ter seu próprio intervalo de tempo!**',
    ].join('\n'),
    guild,
    'Automações',
  ).setColor(0x4b4d33)
    .addFields(
      { name: '♟ Status do Sistema', value: `\`${config.enabled ? '🟢 Habilitado' : '🔴 Desabilitado'}\``, inline: true },
      { name: '▣ Total de Mensagens', value: `\`${itens.length}x\``, inline: true },
    );
  if (listagem) painel.addFields({ name: 'Mensagens Configuradas', value: listagem.replace(/^\n\n\*\*▣ Mensagens Configuradas\*\*\n/, '').slice(0, 1024) });

  return {
    embeds: [painel],
    components: [
      new ActionRowBuilder().addComponents(
        button(id('auto-msg-toggle'), config.enabled ? 'Desabilitar Sistema' : 'Habilitar Sistema', config.enabled ? ButtonStyle.Danger : ButtonStyle.Success, { id: '1529378863891742910', name: 'yuki_refresh' }),
        button(id('auto-msg-new'), 'Nova Mensagem', ButtonStyle.Success, { id: '1529378868904067173', name: 'yuki_add' }),
      ),
      new ActionRowBuilder().addComponents(
        button(id('auto-msg-manage'), 'Gerenciar Mensagens', ButtonStyle.Primary, { id: '1529378865083056201', name: 'yuki_settings' }, !itens.length),
        button(id('auto-msg-view-all'), 'Visualizar Todas', ButtonStyle.Secondary, { id: '1518360441737318591', name: 'visible' }, !itens.length),
        button(id('auto-msg-refresh'), 'Atualizar', ButtonStyle.Secondary, { id: '1529378863891742910', name: 'yuki_refresh' }),
      ),
      new ActionRowBuilder().addComponents(button(id('automations'), 'Voltar', ButtonStyle.Secondary, { id: '1529378867314167882', name: 'yuki_back' })),
    ],
  };
}

export function painelSelecionarCanalMensagem(guild, rascunho) {
  return {
    embeds: [embed(
      'zenSallers\n# Selecione o Canal',
      [
        'Agora selecione o canal onde a mensagem será enviada automaticamente.',
        '',
        '**▣ Preview da mensagem:**',
        `\`\`\`\n${rascunho.content.slice(0, 900)}\n\`\`\``,
        `**◷ Intervalo:** \`${rascunho.intervalMinutes} minutos\``,
      ].join('\n'),
      guild,
      'Selecione um canal abaixo ou adicione o ID manualmente',
    ).setColor(0xe60000)],
    components: [
      new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder().setCustomId(id('auto-msg-channel-new')).setPlaceholder('📣 Selecione o canal de destino'),
      ),
      new ActionRowBuilder().addComponents(
        button(id('auto-msg-channel-id'), 'Adicionar ID Manualmente', ButtonStyle.Secondary, { id: '1529378882539749407', name: 'yuki_user' }),
        button(id('auto-messages'), 'Cancelar', ButtonStyle.Danger, { id: '1529378867314167882', name: 'yuki_back' }),
      ),
    ],
  };
}

export function painelGerenciarMensagens(guild, gs) {
  const itens = gs.automations.messages.items || [];
  const select = new StringSelectMenuBuilder()
    .setCustomId(id('auto-msg-select'))
    .setPlaceholder('📝 Selecione uma mensagem para gerenciar')
    .addOptions(itens.slice(0, 25).map((item) => ({
      label: `#${guild.channels.cache.get(item.channelId)?.name || item.channelId}`.slice(0, 100),
      description: item.content.slice(0, 100),
      value: item.id,
      emoji: '📑',
    })));

  return {
    embeds: [embed(
      'zenSallers\n▣ Gerenciar Mensagens Automáticas',
      `Selecione uma mensagem no menu abaixo para editar, configurar o intervalo ou remover.\n\n◉ **Total de mensagens:** \`${itens.length}x\``,
      guild,
      'Automações',
    ).setColor(0xe60000)],
    components: [
      ...(itens.length ? [new ActionRowBuilder().addComponents(select)] : []),
      new ActionRowBuilder().addComponents(button(id('auto-messages'), 'Voltar', ButtonStyle.Secondary, { id: '1529378867314167882', name: 'yuki_back' })),
    ],
  };
}

/** Lista completa de mensagens automáticas (botão Visualizar Todas) */
export function painelVisualizarTodasMensagens(guild, gs) {
  const itens = gs.automations.messages.items || [];

  if (!itens.length) {
    return {
      embeds: [embed(
        'zenSallers\n👁️ Visualizar Todas',
        'Nenhuma mensagem automática configurada ainda.\n\nUse **Nova Mensagem** para criar a primeira.',
        guild,
        'Automações',
      ).setColor(0xe60000)],
      components: [
        new ActionRowBuilder().addComponents(
          button(id('auto-messages'), 'Voltar', ButtonStyle.Secondary, { id: '1529378867314167882', name: 'yuki_back' }),
        ),
      ],
    };
  }

  const blocos = itens.map((item, index) => {
    const canal = item.channelId
      ? (guild.channels.cache.get(item.channelId)?.name
        ? `#${guild.channels.cache.get(item.channelId).name}`
        : `<#${item.channelId}>`)
      : '`sem canal`';
    const preview = String(item.content || '')
      .replace(/\n+/g, ' ')
      .slice(0, 120);
    const proximo = item.nextRunAt
      ? `<t:${Math.floor(item.nextRunAt / 1000)}:R>`
      : '`—`';
    const ultimo = item.lastSentAt
      ? `<t:${Math.floor(item.lastSentAt / 1000)}:R>`
      : '`nunca`';

    return [
      `**${index + 1}.** ${canal} · \`${item.intervalMinutes} min\` · \`${item.mode === 'embed' ? 'Embed' : 'Texto'}\``,
      `> ${preview || '*sem conteúdo*'}`,
      `-# Próximo: ${proximo} · Último: ${ultimo}`,
    ].join('\n');
  });

  // Discord embed description max 4096
  let descricao = [
    `Todas as mensagens automáticas do servidor (**${itens.length}x**).`,
    '',
    ...blocos,
  ].join('\n\n');

  if (descricao.length > 4000) {
    descricao = `${descricao.slice(0, 3950)}\n\n-# … lista truncada (${itens.length} mensagens)`;
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(id('auto-msg-select'))
    .setPlaceholder('📂 Abrir uma mensagem para editar')
    .addOptions(
      itens.slice(0, 25).map((item, index) => ({
        label: `${index + 1}. #${guild.channels.cache.get(item.channelId)?.name || item.channelId || 'canal'}`.slice(0, 100),
        description: String(item.content || 'Sem conteúdo').slice(0, 100),
        value: item.id,
        emoji: '📑',
      })),
    );

  return {
    embeds: [embed(
      'zenSallers\n👁️ Visualizar Todas as Mensagens',
      descricao,
      guild,
      `${itens.length} mensagem(ns)`,
    ).setColor(0xe60000)],
    components: [
      new ActionRowBuilder().addComponents(select),
      new ActionRowBuilder().addComponents(
        button(id('auto-msg-manage'), 'Gerenciar', ButtonStyle.Primary, { id: '1529378865083056201', name: 'yuki_settings' }),
        button(id('auto-messages'), 'Voltar', ButtonStyle.Secondary, { id: '1529378867314167882', name: 'yuki_back' }),
      ),
    ],
  };
}

export function painelConfigurarMensagem(guild, item) {
  return {
    embeds: [embed('zenSallers\n◉ Configurar Mensagem', resumoMensagem(item), guild, `ID: ${item.id}`).setColor(0xe60000)],
    components: [
      new ActionRowBuilder().addComponents(
        button(id('auto-msg-edit', item.id), 'Editar Conteúdo', ButtonStyle.Primary, { id: '1529378875115835482', name: 'yuki_edit' }),
        button(id('auto-msg-interval', item.id), 'Alterar Intervalo', ButtonStyle.Primary, { id: '1518360388368859268', name: 'clock' }),
        button(id('auto-msg-mode', item.id), item.mode === 'embed' ? 'Usar Mensagem' : 'Usar Embed', item.mode === 'embed' ? ButtonStyle.Secondary : ButtonStyle.Success, { id: '1518360441737318591', name: 'visible' }),
      ),
      new ActionRowBuilder().addComponents(
        button(id('auto-msg-buttons', item.id), `Botões (${item.buttons?.length || 0}/5)`, ButtonStyle.Primary, { id: '1529378866433622167', name: 'yuki_member' }),
        button(id('auto-msg-color', item.id), 'Alterar Cor', ButtonStyle.Secondary, { id: '1529378865083056201', name: 'yuki_settings' }, item.mode !== 'embed'),
        button(id('auto-msg-send', item.id), 'Forçar Envio', ButtonStyle.Secondary, { id: '1529378863891742910', name: 'yuki_refresh' }),
      ),
      new ActionRowBuilder().addComponents(
        button(id('auto-msg-change-channel', item.id), 'Trocar Canal', ButtonStyle.Secondary, { id: '1529378885060263997', name: 'yuki_channel' }),
        button(id('auto-msg-remove', item.id), 'Remover', ButtonStyle.Danger, { id: '1518360434304880722', name: 'trashcan' }),
      ),
      new ActionRowBuilder().addComponents(button(id('auto-msg-manage'), 'Voltar', ButtonStyle.Secondary, { id: '1529378867314167882', name: 'yuki_back' })),
    ],
  };
}

export function painelBotoesMensagem(guild, item) {
  const linhas = item.buttons?.length
    ? item.buttons.map((botao, index) => `\`${index + 1}.\` **${botao.label}** · ${botao.url}`).join('\n')
    : '`Nenhum botão configurado`';

  return {
    embeds: [embed(
      'zenSallers\n🔗 Gerenciar Botões URL',
      `Configure até **5 botões** que serão exibidos na mensagem automática.\n\n**▣ Botões Configurados**\n${linhas}`,
      guild,
      `${item.buttons?.length || 0}/5 botões configurados`,
    ).setColor(0xe60000)],
    components: [
      new ActionRowBuilder().addComponents(
        button(id('auto-msg-button-add', item.id), 'Adicionar Botão', ButtonStyle.Success, { id: '1529378868904067173', name: 'yuki_add' }, (item.buttons?.length || 0) >= 5),
        button(id('auto-msg-button-clear', item.id), 'Remover Todos', ButtonStyle.Danger, { id: '1518360434304880722', name: 'trashcan' }, !item.buttons?.length),
      ),
      new ActionRowBuilder().addComponents(button(id('auto-msg-open', item.id), 'Voltar', ButtonStyle.Secondary, { id: '1529378867314167882', name: 'yuki_back' })),
    ],
  };
}

export function payloadMensagemAutomatica(item) {
  const components = item.buttons?.length
    ? [new ActionRowBuilder().addComponents(...item.buttons.slice(0, 5).map((botao) => {
        const component = new ButtonBuilder().setLabel(botao.label).setStyle(ButtonStyle.Link).setURL(botao.url);
        if (botao.emoji) component.setEmoji(botao.emoji);
        return component;
      }))]
    : [];

  if (item.mode === 'embed') {
    const messageEmbed = new EmbedBuilder().setColor(item.color || '#E60000').setDescription(item.content);
    if (item.image) messageEmbed.setImage(item.image);
    return { embeds: [messageEmbed], components };
  }

  return { content: item.content, components };
}
