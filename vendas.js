import { ActionRowBuilder, ButtonStyle, EmbedBuilder } from '../discord/compat.js';
import {
  CORES,
  componentesEntregaDm,
  embedEntregaDm,
  embedLogEntregaCanal,
  embedPedidoAprovado,
  embedPedidoSolicitado,
  embedPedidoSolicitadoDm,
  payloadFeedback,
} from './embeds-cliente.js';
import { button, embed, id, linkButton, money } from '../discord/componentes.js';
export function criarLogsDeVendas(ctx) {
  const {
    ActionRowBuilder: AR,
    ButtonStyle: BS,
    EmbedBuilder: EB,
    button: btn,
    cartAmounts,
    cartField,
    cartItemName,
    cartProduct,
    embed: emb,
    id: mkId,
    linkButton: lbtn,
    money: moneyFn,
    parseHex,
    renderFeedback,
  } = ctx;

  // Prefer deps injetados; fallback aos imports locais
  const _button = btn || button;
  const _id = mkId || id;
  const _linkButton = lbtn || linkButton;
  const _money = moneyFn || money;
  const _embed = emb || embed;
  const _AR = AR || ActionRowBuilder;
  const _BS = BS || ButtonStyle;
  const _EB = EB || EmbedBuilder;

  async function sendConfiguredLog(guild, channelId, payload) {
    if (!channelId) return null;
    const channel = await guild.channels.fetch(channelId).catch((error) => {
      console.error(`[vendas] não foi possível acessar o canal de log ${channelId}:`, error?.message || error);
      return null;
    });
    if (!channel?.isTextBased()) {
      console.error(`[vendas] o canal de log ${channelId} não é um canal de texto ou não existe`);
      return null;
    }
    return channel.send(payload).catch((error) => {
      console.error(`[vendas] falha ao enviar log no canal ${channelId}:`, error?.message || error);
      return null;
    });
  }

  function editStockButton(product, field) {
    return new _AR().addComponents(
      _button(
        _id('field-stock', product?.id || 'missing', field?.id || 'missing'),
        'Editar estoque',
        _BS.Primary,
        "<:yuki_edit:1529378875115835482>",
      ),
    );
  }

  async function sendManualApprovalLog(guild, gs, cart, approverId) {
    if (cart.manualApprovalLogSent) return null;
    const product = cartProduct(gs, cart);
    const field = cartField(gs, cart);
    const total = cartAmounts(gs, cart).total;

    const sent = await sendConfiguredLog(guild, gs.channels.orderLogs, {
      embeds: [
        new _EB()
          .setColor(CORES.verde)
          .setAuthor({
            name: 'Pagamento confirmado',
            iconURL: guild.iconURL?.({ size: 64 }) || undefined,
          })
          .setDescription(`Usuário <@${cart.userId}> pagou **${_money(total)}** via PIX.`)
          .addFields(
            {
              name: 'Detalhes',
              value: `\`${cart.quantity}x ${cartItemName(product, field)} | ${_money(total)}\``,
              inline: false,
            },
            {
              name: 'Gateway de Pagamento',
              value: `\`${cart.paymentMethod || 'Pix - Semiautomático'}\``,
              inline: false,
            },
            { name: 'ID do Pedido', value: `\`${cart.orderId || `AM_${cart.id}`}\``, inline: false },
          )
          .setFooter({ text: guild?.name || 'Loja' })
          .setTimestamp(),
      ],
    });
    if (sent) cart.manualApprovalLogSent = true;
    return sent;
  }

  async function sendOrderRequestedLog(guild, gs, cart) {
    if (cart.requestLogSent) return null;
    const product = cartProduct(gs, cart);
    const field = cartField(gs, cart);
    const total = cartAmounts(gs, cart).total;

    // Log no canal (mesmo visual do DM do cliente)
    const sent = await sendConfiguredLog(guild, gs.channels.orderLogs, {
      embeds: [
        embedPedidoSolicitado({
          guild,
          userId: cart.userId,
          orderId: cart.orderId || `AM_${cart.id}`,
          product,
          field,
          quantity: cart.quantity,
          total,
          cartItemName,
          paymentLabel: cart.paymentMethod || 'Pix - Semiautomático',
        }),
      ],
    });

    // DM do cliente com o mesmo visual
    const member = await guild.members.fetch(cart.userId).catch(() => null);
    if (member) {
      await member
        .send({
          embeds: [
            embedPedidoSolicitadoDm({
              guild,
              product,
              field,
              quantity: cart.quantity,
              total,
              cartItemName,
              paymentLabel: cart.paymentMethod || 'Pix - Semiautomático',
            }),
          ],
        })
        .catch(() => null);
    }

    if (sent) cart.requestLogSent = true;
    return sent;
  }

  async function sendBuyerDeliveryDm(member, guild, gs, cart, product, field, delivered) {
    if (!member) return null;

    const orderId = cart.orderId || `AM_${cart.id}`;
    const total = cart.total ?? cartAmounts(gs, cart).total;

    // 1) Pedido aprovado
    await member
      .send({
        embeds: [
          embedPedidoAprovado({
            guild,
            product,
            field,
            quantity: cart.quantity,
            total,
            cartItemName,
            paymentLabel: cart.paymentMethod
              ? `${cart.paymentMethod} - Aprovado`
              : 'Pix - Aprovado manualmente',
          }),
        ],
      })
      .catch(() => null);

    // Guarda entrega no cart (botão copiar)
    cart.deliveredItems = Array.isArray(delivered) ? [...delivered] : [String(delivered || '')];
    cart.orderId = orderId;

    // 2) Entrega realizada
    const deliveryEmbed = embedEntregaDm({
      guild,
      orderId,
      product,
      field,
      quantity: cart.quantity,
      total,
      delivered: cart.deliveredItems,
      cartItemName,
    });

    const components = componentesEntregaDm({ guild, cart, product, field });
    const fileName = `${orderId}.txt`.replace(/[^a-zA-Z0-9_.-]/g, '_');

    const deliveredMessage = await member
      .send({
        embeds: [deliveryEmbed],
        files: [
          {
            attachment: Buffer.from(cart.deliveredItems.join('\n'), 'utf8'),
            name: fileName,
          },
        ],
        components,
      })
      .catch(() => null);

    // 3) Feedback enviado depois da entrega, nunca junto das três mensagens do pedido.
    const feedbackDelay = Math.max(30, Number(gs.customization?.feedbackDm?.delaySeconds || 120)) * 1000;
    const feedbackTimer = setTimeout(async () => {
      const fb = payloadFeedback({ guild, user: member.user, gs, renderFeedback });
      if (fb.content) await member.send(fb).catch(() => null);
    }, feedbackDelay);
    feedbackTimer.unref?.();

    return deliveredMessage;
  }

  async function sendOutOfStockLog(guild, gs, product, field) {
    return sendConfiguredLog(guild, gs.channels.orderLogs, {
      content: '@everyone',
      embeds: [
        new _EB()
          .setColor(CORES.vermelho)
          .setAuthor({
            name: 'Alerta de estoque!',
            iconURL: guild.iconURL?.({ size: 64 }) || undefined,
          })
          .setDescription(
            `O estoque do produto **${cartItemName(product, field)}** acabou!`,
          )
          .addFields(
            { name: 'Produto', value: product?.name || 'Produto removido', inline: true },
            { name: 'Campo', value: field?.name || 'Campo removido', inline: true },
          )
          .setTimestamp(),
      ],
      components: [editStockButton(product, field)],
    });
  }

  async function sendDeliveryLog(guild, gs, cart) {
    if (cart.deliveryLogSent) return null;
    const product = cartProduct(gs, cart);
    const field = cartField(gs, cart);

    const fileName = `${cart.orderId || `AM_${cart.id}`}.txt`.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const orderLogSent = Boolean(await sendConfiguredLog(guild, gs.channels.orderLogs, {
      embeds: [
        embedLogEntregaCanal({
          guild,
          cart,
          product,
          field,
          cartItemName,
          total: cartAmounts(gs, cart).total,
        }),
      ],
      components: [editStockButton(product, field)],
      files: cart.deliveredItems?.length ? [{ attachment: Buffer.from(cart.deliveredItems.join('\n'), 'utf8'), name: fileName }] : [],
    }));

    let publicLogSent = false;
    if (gs.channels.publicPurchases) {
      const item = `${cart.quantity}x ${cartItemName(product, field)}`;
      const totalStr = _money(cartAmounts(gs, cart).total);
      const actions = [];
      if (gs.customization.publicLog.showBuy && product?.salesMessage) {
        actions.push(
          _linkButton(
            `https://discord.com/channels/${guild.id}/${product.salesMessage.channelId}/${product.salesMessage.messageId}`,
            'Comprar novamente',
            "<:carrinhoZend:1518282439712309268>",
          ),
        );
      }
      if (gs.customization.publicLog.showFeedback && gs.channels.feedback) {
        actions.push(
          _linkButton(
            `https://discord.com/channels/${guild.id}/${gs.channels.feedback}`,
            'Feedbacks',
            '🏆',
          ),
        );
      }

      // Container V2 (quando ativado nas customizações)
      if (gs.customization.publicLog.v2) {
        const {
          ContainerBuilder,
          TextDisplayBuilder,
          MediaGalleryBuilder,
          MediaGalleryItemBuilder,
          MessageFlags,
        } = await import('discord.js');

        const components = [];
        if (gs.customization.publicLog.image) {
          components.push(
            new MediaGalleryBuilder().addItems(
              new MediaGalleryItemBuilder().setURL(gs.customization.publicLog.image),
            ),
          );
        }
        components.push(
          new ContainerBuilder()
            .setAccentColor(parseHex(gs.customization.colors.success) || CORES.verde)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                [
                  '### 🛍️ Entrega Realizada!',
                  `O usuário <@${cart.userId}> teve seu pedido entregue.`,
                  '',
                  `**Carrinho** · \`${item}\``,
                  `**Valor pago** · \`${totalStr}\``,
                ].join('\n'),
              ),
            ),
        );
        if (actions.length) {
          components.push(new _AR().addComponents(...actions));
        }

        publicLogSent = Boolean(await sendConfiguredLog(guild, gs.channels.publicPurchases, {
          flags: MessageFlags.IsComponentsV2,
          components,
        }));
      } else {
        const publicEmbed = _embed(
          '🛍️ Entrega Realizada!',
          [
            `O usuário <@${cart.userId}> teve seu pedido entregue.`,
            '',
            '**Carrinho**',
            `\`${item}\``,
            '',
            '**Valor pago**',
            `\`${totalStr}\``,
          ].join('\n'),
          guild,
          'Log pública de entregas',
        ).setColor(parseHex(gs.customization.colors.success) || CORES.verde);

        if (gs.customization.publicLog.image) {
          publicEmbed.setImage(gs.customization.publicLog.image);
        }

        publicLogSent = Boolean(await sendConfiguredLog(guild, gs.channels.publicPurchases, {
          embeds: [publicEmbed],
          components: actions.length ? [new _AR().addComponents(...actions)] : [],
        }));
      }
    }

    cart.deliveryLogSent = orderLogSent || publicLogSent;
    cart.publicPurchaseLogSent = publicLogSent;
    return cart.deliveryLogSent;
  }

  async function sendApprovalLog(guild, gs, cart) {
    if (cart.approvalLogSent && cart.logMessage) return null;
    const product = cartProduct(gs, cart);
    const field = cartField(gs, cart);

    const log = _embed(
      `${"<:icons8carrinhodecomprascarregado:1518360400977072259>"} Pedido aguardando aprovação`,
      [
        `**Carrinho:** \`${cart.publicId}\``,
        `**Cliente:** <@${cart.userId}>`,
        `**Produto:** \`${product?.name || 'Removido'} • ${field?.name || 'Removido'}\``,
        `**Quantidade:** \`${cart.quantity}x\``,
        `**Total:** \`${_money(cart.total)}\``,
        `**Pagamento:** \`${cart.paymentMethod || 'Manual'}\``,
        `**Comprovante:** ${cart.proof || '`Não informado`'}`,
      ].join('\n'),
      guild,
      'Logs de pedidos',
    ).setColor(CORES.amarelo);

    const sent = await sendConfiguredLog(guild, gs.channels.orderLogs, {
      embeds: [log],
      components: [
        new _AR().addComponents(
          _button(
            _id('cart-admin-approve', cart.id),
            'Confirmar pagamento',
            _BS.Success,
            "<:yuki_check:1529378856132415609>",
          ),
          _button(
            _id('cart-admin-decline', cart.id),
            'Recusar pagamento',
            _BS.Danger,
            "<:yuki_error:1529378857575256175>",
          ),
        ),
      ],
    });

    if (sent) {
      cart.logMessage = { channelId: sent.channelId, messageId: sent.id };
      cart.approvalLogSent = true;
    }
    return sent;
  }

  return {
    sendConfiguredLog,
    editStockButton,
    sendManualApprovalLog,
    sendOrderRequestedLog,
    sendBuyerDeliveryDm,
    sendOutOfStockLog,
    sendDeliveryLog,
    sendApprovalLog,
  };
}
