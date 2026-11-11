import { ActionRowBuilder, ButtonStyle, StringSelectMenuBuilder } from '../discord/compat.js';
import { button, embed, id, money } from '../discord/componentes.js';

export function comprasEntreguesDoUsuario(gs, userId) {
  return [...(gs.purchases || [])]
    .filter((purchase) => purchase.userId === userId && purchase.status === 'DELIVERED')
    .sort((left, right) => Number(right.at || 0) - Number(left.at || 0));
}

function nomeCompra(purchase) {
  return String(purchase.product || 'Produto adquirido').replace(/\s*[•-]\s*/g, ' - ');
}

export function payloadSelecaoCompraTicket(guild, gs, ticket, fn) {
  if (fn?.purchaseDetection === false) return null;
  const purchases = comprasEntreguesDoUsuario(gs, ticket.userId);
  if (!purchases.length) return null;
  const select = new StringSelectMenuBuilder()
    .setCustomId(id('ticket-purchase-select', ticket.id))
    .setPlaceholder('Selecione uma das suas últimas compras')
    .addOptions(purchases.slice(0, 25).map((purchase) => ({
      label: `Compra (${nomeCompra(purchase)})`.slice(0, 100),
      description: `${money(purchase.amount)} · ${new Date(purchase.at || Date.now()).toLocaleDateString('pt-BR')}`.slice(0, 100),
      value: purchase.id,
    })));
  return {
    embeds: [embed(
      'Compras encontradas ✓',
      [
        `• Encontramos \`${purchases.length}\` compra(s) feitas por você.`,
        '• Caso o ticket não esteja relacionado a um produto adquirido, clique em: **“Não é sobre um produto adquirido”**.',
      ].join('\n'),
      guild,
      'Detecção de compras',
    ).setColor(0x4b4d33)],
    components: [
      new ActionRowBuilder().addComponents(select),
      new ActionRowBuilder().addComponents(
        button(id('ticket-purchase-none', ticket.id), 'Não é sobre um produto adquirido', ButtonStyle.Secondary),
      ),
    ],
  };
}

export function payloadCompraSelecionada(guild, ticket, purchase) {
  return {
    embeds: [embed(
      'Pedido Selecionado',
      [
        `Ticket para tratar sobre o produto: **${nomeCompra(purchase)}**`,
        '',
        `Confira abaixo os detalhes da compra de <@${ticket.userId}>:`,
        '',
        '**Detalhes**',
        `**Produto:** \`${nomeCompra(purchase)}\``,
        `**Valor:** \`${money(purchase.amount)}\``,
        `**Data de compra:** <t:${Math.floor(Number(purchase.at || Date.now()) / 1000)}:F>`,
        '',
        '**Estatísticas**',
        `**ID do Pedido:** \`${purchase.publicId || purchase.id}\``,
      ].join('\n'),
      guild,
      'Compra vinculada ao ticket',
    ).setColor(0x22c55e)],
    components: [],
  };
}

export function nomeCanalCompra(purchase, ticket) {
  const nome = nomeCompra(purchase).split(' - ').at(-1) || 'produto';
  return `-${nome}・${ticket.userId}`.toLowerCase().replace(/[^a-z0-9áàâãéêíóôõúç._・-]/gi, '-').slice(0, 90);
}
