
import { consultarCobrancaEfi, criarCobrancaEfi } from '../pagamentos/efi.js';
import { consultarCobrancaEvoPay, criarCobrancaEvoPay } from '../pagamentos/evopay.js';
import { verificarPagamentoImap } from '../pagamentos/imap.js';
import QRCode from 'qrcode';

export function criarSistemaCarrinho(ctx) {
  const {
    ActionRowBuilder,
    ButtonStyle,
    ChannelType,
    ContainerBuilder,
    EMOJI,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SeparatorBuilder,
    StringSelectMenuBuilder,
    TextDisplayBuilder,
    TextInputStyle,
    balanceUser,
    client,
    state,
    saveState,
    button,
    embed,
    guildState,
    id,
    linkButton,
    modal,
    money,
    nowFooter,
    salePayload,
    sendApprovalLog,
    sendBuyerDeliveryDm,
    sendConfiguredLog,
    sendDeliveryLog,
    sendManualApprovalLog,
    sendOrderRequestedLog,
    sendOutOfStockLog,
    stockCount,
    textInput,
  } = ctx;

const CART_TERMINAL_STATUSES = new Set(['DELIVERED', 'CANCELLED', 'EXPIRED', 'DECLINED']);
const CART_EDITABLE_STATUSES = new Set(['OPEN', 'PAYMENT_SELECTION']);

function cartPublicId(gs) {
  gs.cartSequence = Number(gs.cartSequence || 0) + 1;
  return `ZEND-${String(gs.cartSequence).padStart(5, '0')}`;
}

function getCart(gs, query) {
  if (!query) return null;
  const clean = String(query).trim().toUpperCase();
  return gs.carts.find((cart) => cart.id === query || cart.publicId?.toUpperCase() === clean || cart.channelId === query) || null;
}

function cartProduct(gs, cart) {
  return gs.products.find((product) => product.id === cart.productId) || null;
}

function cartField(gs, cart) {
  return cartProduct(gs, cart)?.fields?.find((field) => field.id === cart.fieldId) || null;
}

function availableStock(field) {
  if (!field) return 0;
  if (field.infinite?.enabled) return Number.POSITIVE_INFINITY;
  return stockCount(field);
}

function clampCartQuantity(cart, field) {
  const min = Math.max(1, Number(field?.minQty || 1));
  const configuredMax = Math.max(min, Number(field?.maxQty || 99));
  const stock = availableStock(field);
  const max = Number.isFinite(stock) ? Math.max(0, Math.min(configuredMax, stock)) : configuredMax;
  cart.quantity = Math.max(min, Math.min(Number(cart.quantity || min), max || min));
  return { min, max };
}

function findCartCoupon(product, code) {
  if (!code) return null;
  return (product?.coupons || []).find((coupon) => String(coupon.code).toUpperCase() === String(code).trim().toUpperCase()) || null;
}

function cartAmounts(gs, cart) {
  const product = cartProduct(gs, cart);
  const field = cartField(gs, cart);
  const subtotal = Math.round(Number(field?.price || 0) * Number(cart.quantity || 1) * 100) / 100;
  const coupon = findCartCoupon(product, cart.couponCode);
  const discountPercent = coupon ? Math.max(0, Math.min(100, Number(coupon.discount || 0))) : 0;
  const discount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  const baseTotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  const total = Number.isFinite(Number(cart.pixTotal)) ? Number(cart.pixTotal) : baseTotal;
  Object.assign(cart, { subtotal, discountPercent, discount, baseTotal, total });
  return { subtotal, discountPercent, discount, baseTotal, total, coupon };
}

function crc16(value) {
  let crc = 0xffff;
  for (const char of value) {
    crc ^= char.charCodeAt(0) << 8;
    for (let i = 0; i < 8; i += 1) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function tlv(id, value) {
  const texto = String(value);
  return `${id}${String(texto.length).padStart(2, '0')}${texto}`;
}

function gerarPixCopiaCola(chave, valor, descricao = 'Pagamento') {
  const chavePix = String(chave || '').trim();
  const valorPix = Number(valor);
  if (!chavePix || !Number.isFinite(valorPix) || valorPix <= 0) return '';
  const merchantAccount = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', chavePix);
  const payloadSemCrc = [
    tlv('00', '01'),
    tlv('26', merchantAccount),
    tlv('52', '0000'),
    tlv('53', '986'),
    tlv('54', valorPix.toFixed(2)),
    tlv('58', 'BR'),
    tlv('59', 'ZEN SELLERS'.slice(0, 25)),
    tlv('60', 'SAO PAULO'),
    tlv('62', tlv('05', String(descricao).replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 25))),
    '6304',
  ].join('');
  return `${payloadSemCrc}${crc16(payloadSemCrc)}`;
}

function atribuirPixTotal(gs, cart, provider) {
  const amounts = cartAmounts(gs, cart);
  const baseCentavos = Math.round(Number(amounts.baseTotal) * 100);
  const concorrentes = (gs.carts || []).filter((item) => (
    item.id !== cart.id
    && item.status === 'AWAITING_PAYMENT'
    && item.gateway?.provider === provider
    && Math.round(Number(item.baseTotal ?? cartAmounts(gs, item).baseTotal) * 100) === baseCentavos
    && Number(item.createdAt || 0) <= Number(cart.createdAt || Date.now())
  )).length;
  cart.baseTotal = amounts.baseTotal;
  cart.pixTotal = (baseCentavos + concorrentes) / 100;
  cart.pixSequence = concorrentes;
  cartAmounts(gs, cart);
  return cart.pixTotal;
}

function cartStatusLabel(status) {
  return ({
    OPEN: 'Montando carrinho',
    PAYMENT_SELECTION: 'Escolhendo pagamento',
    AWAITING_MANUAL_PAYMENT: 'Aguardando comprovante',
    AWAITING_APPROVAL: 'Aguardando aprovação',
    PROCESSING: 'Processando entrega',
    DELIVERED: 'Entregue',
    CANCELLED: 'Cancelado',
    EXPIRED: 'Expirado',
    DECLINED: 'Pagamento recusado',
  })[status] || status;
}

function cartBuyerName(cart) {
  return (cart.userName || cart.userTag || cart.publicId || 'cliente').split('#')[0].replace(/[^\w.-]/g, '').slice(0, 32) || 'cliente';
}

function cartThreadName(cart, marker = 'cart') {
  const icon = marker === 'paid' ? '➕' : marker === 'delivered' ? '✅' : marker === 'cancelled' ? '❌' : '🛒';
  return `${icon}・${cartBuyerName(cart)}・${cart.userId}`;
}

function cartItemName(product, field) {
  return `${product?.name || 'Produto removido'} - ${field?.name || 'Campo removido'}`;
}

function cartItemsText(gs, cart, payment = false) {
  const product = cartProduct(gs, cart);
  const field = cartField(gs, cart);
  if (payment) return `- ${cart.quantity}x **${field?.name || product?.name || 'Produto'}**`;
  const amounts = cartAmounts(gs, cart);
  const stock = availableStock(field);
  return [
    `${"<a:setaAnimada:1518360421633884440>"} **(${cart.quantity}x)** ${product?.name || 'Produto removido'} - **\`${field?.name || 'Campo removido'}\`**`,
    `-# \`${money(field?.price || 0)}\` por unidade · subtotal **\`${money(amounts.subtotal)}\`** · **estoque ${Number.isFinite(stock) ? stock : '∞'}**`,
  ].join('\n');
}

function cartSummaryContainer(gs, cart) {
  const amounts = cartAmounts(gs, cart);
  const couponLine = cart.couponCode
    ? `\n${"<:yuki_ticket:1529378862457290762>"} **Cupom** — \`${cart.couponCode}\` (${cart.discountPercent}% OFF)`
    : '';
  return new ContainerBuilder()
    .setAccentColor(0xffffff)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Revisão do Pedido — ${cartBuyerName(cart)}`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(cartItemsText(gs, cart)))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent([
      `${"<:zendCart:1518282499577610310>"} **Total de itens** — \`${cart.quantity}\``,
      `${"<:zendPay:1518282506019803196>"} **Total à vista** — \`${money(amounts.total)}\`${couponLine}`,
    ].join('\n')));
}

function paymentSummaryContainer(gs, cart) {
  const amounts = cartAmounts(gs, cart);
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${"<:zendCart:1518282499577610310>"} Forma de Pagamento\n-# ${"<a:setaAnimada:1518360421633884440>"} Selecione abaixo como deseja pagar.`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Itens:** \`${cart.quantity}\`  ·  **Total:** \`${money(amounts.total)}\``))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Itens no carrinho\n${cartItemsText(gs, cart, true)}`));
}

function hasConfiguredPayment(gs) {
  return Object.values(gs.payments || {}).some((method) => method?.enabled && method?.configured);
}

function hasConfiguredManualPix(gs) {
  const manual = gs.payments?.manual;
  return Boolean(manual?.enabled && manual?.configured && String(manual.pixKey || '').trim());
}

function pixCopyPasteCode(gs, cart) {
  if (cart.pixCopiaCola) return String(cart.pixCopiaCola).trim();
  if (cart.gateway?.copiaCola) return String(cart.gateway.copiaCola).trim();
  const amounts = cartAmounts(gs, cart);
  const provider = cart.gateway?.provider;
  const gateway = provider ? gs.payments?.[provider] : null;
  const pixKey = gateway?.pixKey || gateway?.key || gateway?.chavePix || gs.payments?.manual?.pixKey;
  const codigo = gerarPixCopiaCola(pixKey, amounts.total, cart.publicId);
  if (codigo) cart.pixCopiaCola = codigo;
  return codigo;
}

function cartEmbed(guild, gs, cart) {
  const product = cartProduct(gs, cart);
  const field = cartField(gs, cart);
  const amounts = cartAmounts(gs, cart);
  const stock = availableStock(field);
  const color = cart.status === 'DELIVERED'
    ? 0x22c55e
    : ['CANCELLED', 'EXPIRED', 'DECLINED'].includes(cart.status)
      ? 0xef4444
      : 0x2b2d31;
  const e = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${"<:icons8carrinhodecomprascarregado:1518360400977072259>"} Carrinho • ${cart.publicId}`)
    .setDescription([
      `Olá, <@${cart.userId}>! Confira os dados do seu pedido abaixo.`,
      '',
      `**Produto:** \`${product?.name || 'Produto removido'}\``,
      `**Variação:** \`${field?.name || 'Não selecionada'}\``,
      `**Quantidade:** \`${cart.quantity || 1}x\``,
      `**Estoque disponível:** \`${Number.isFinite(stock) ? stock : '∞'}\``,
      cart.couponCode ? `**Cupom:** \`${cart.couponCode}\` (${amounts.discountPercent}% OFF)` : '**Cupom:** `Nenhum`',
      '',
      `**Subtotal:** \`${money(amounts.subtotal)}\``,
      `**Desconto:** \`- ${money(amounts.discount)}\``,
      `**Total:** \`${money(amounts.total)}\``,
      '',
      `**Status:** \`${cartStatusLabel(cart.status)}\``,
      `**Expira:** <t:${Math.floor(cart.expiresAt / 1000)}:R>`,
    ].join('\n'))
    .setFooter(nowFooter(guild, 'Carrinho Zend'))
    .setTimestamp();
  if (product?.icon) e.setThumbnail(product.icon);
  if (product?.banner) e.setImage(product.banner);
  return e;
}

function cartComponents(gs, cart) {
  const product = cartProduct(gs, cart);
  const field = cartField(gs, cart);
  const editable = CART_EDITABLE_STATUSES.has(cart.status);
  const components = [];
  if ((product?.fields?.length || 0) > 1) {
    components.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(id('cart-field', cart.id))
          .setPlaceholder('Selecione uma variação')
          .setDisabled(!editable)
          .addOptions(product.fields.slice(0, 25).map((item) => ({
            label: item.name.slice(0, 100),
            description: `${money(item.price)} • Estoque: ${Number.isFinite(availableStock(item)) ? availableStock(item) : '∞'}`.slice(0, 100),
            value: item.id,
            default: item.id === cart.fieldId,
          }))),
      ),
    );
  }
  components.push(
    new ActionRowBuilder().addComponents(
      button(id('cart-checkout', cart.id), 'Ir para o Pagamento', ButtonStyle.Success, { id: '1529378856132415609', name: 'yuki_check' }, !editable || !field || availableStock(field) < cart.quantity),
      button(id('cart-quantity', cart.id), 'Editar Quantidade', ButtonStyle.Primary, { id: '1529378875115835482', name: 'yuki_edit' }, !editable),
    ),
    new ActionRowBuilder().addComponents(
      button(id('cart-coupon', cart.id), 'Usar Cupom', ButtonStyle.Secondary, { id: '1529378862457290762', name: 'yuki_ticket' }, !editable),
      button(id('cart-cancel', cart.id), 'Cancelar', ButtonStyle.Danger, { id: '1518282449363144744', name: 'delete' }, CART_TERMINAL_STATUSES.has(cart.status)),
    ),
  );
  return components;
}

function cartPayload(guild, gs, cart) {
  // Payload V2 puro — sem content/embeds
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      new TextDisplayBuilder().setContent(`### Carrinho · <@${cart.userId}>`),
      cartSummaryContainer(gs, cart),
      ...cartComponents(gs, cart),
    ],
  };
}

function paymentPayload(guild, gs, cart) {
  const manualEnabled = hasConfiguredManualPix(gs);
  const efiEnabled = Boolean(gs.payments?.efi?.enabled && gs.payments?.efi?.configured);
  const interEnabled = Boolean(gs.payments?.interImap?.enabled && gs.payments?.interImap?.configured);
  const nubankEnabled = Boolean(gs.payments?.nubankImap?.enabled && gs.payments?.nubankImap?.configured);
  const evoPayEnabled = Boolean(gs.payments?.evopay?.enabled && gs.payments?.evopay?.configured);
  const pixAction = evoPayEnabled ? 'cart-pay-evopay'
    : efiEnabled ? 'cart-pay-efi'
      : manualEnabled ? 'cart-pay-manual'
        : interEnabled ? 'cart-pay-inter'
          : nubankEnabled ? 'cart-pay-nubank' : 'cart-pay-manual';
  const pixEnabled = evoPayEnabled || efiEnabled || manualEnabled || interEnabled || nubankEnabled;
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [
      paymentSummaryContainer(gs, cart),
      new ActionRowBuilder().addComponents(
        button(id(pixAction, cart.id), 'PIX', ButtonStyle.Success, '💠', !pixEnabled),
        button(id('cart-pay-card', cart.id), 'Cartão de Crédito/Débito', ButtonStyle.Primary, { id: '1518282445986992259', name: 'cpfnanotaeolhela' }),
      ),
      new ActionRowBuilder().addComponents(
        button(id('cart-edit', cart.id), 'Voltar', ButtonStyle.Secondary, { id: '1518282436453339437', name: 'Arrow' }),
      ),
    ],
  };
}

async function manualPaymentPayload(guild, gs, cart) {
  const manual = gs.payments?.manual || {};
  const pixKey = String(manual.pixKey || '').replace(/`/g, '').trim();
  const keyType = String(manual.keyType || 'Chave Pix').replace(/`/g, '').trim();
  const configuredMessage = String(manual.message || '').trim().slice(0, 1500);
  const amounts = cartAmounts(gs, cart);
  const copiaCola = gerarPixCopiaCola(pixKey, amounts.total, cart.publicId);
  cart.pixCopiaCola = copiaCola;
  const qr = copiaCola ? await QRCode.toBuffer(copiaCola, { width: 420, margin: 2 }) : null;
  return {
    content: [
      `💠 **PIX — ${keyType}:**`,
      `**Valor:** \`${money(amounts.total)}\``,
      copiaCola ? `**PIX Copia e Cola:**\n\`${copiaCola}\`` : `**Chave PIX:**\n\`${pixKey}\``,
      configuredMessage,
      'Escaneie o QR Code ou copie o código PIX acima.',
    ].filter(Boolean).join('\n'),
    files: qr ? [{ attachment: qr, name: `pix-${cart.publicId}.png` }] : [],
    components: [
      new ActionRowBuilder().addComponents(
        button(id('cart-copy-code', cart.id), 'Pix copia e cola', ButtonStyle.Primary, { id: '1192868868784394381', name: 'copiaCola' }),
        button(id('cart-confirm-payment', cart.id), 'Confirmar pagamento', ButtonStyle.Success),
        button(id('cart-cancel', cart.id), 'Cancelar', ButtonStyle.Danger),
      ),
    ],
  };
}

async function pagamentoAutomaticoPayload(guild, gs, cart, provider) {
  const amounts = cartAmounts(gs, cart);
  const isEfi = provider === 'efi';
  const isEvoPay = provider === 'evopay';
  const config = gs.payments[provider];
  const nome = isEfi ? 'Efí Bank' : isEvoPay ? 'EvoPay Cash' : provider === 'interImap' ? 'Banco Inter' : 'Nubank';
  const codigo = isEfi || isEvoPay ? cart.gateway?.copiaCola : gerarPixCopiaCola(config.pixKey || config.key || config.chavePix, amounts.total, cart.publicId);
  if (codigo) {
    cart.pixCopiaCola = codigo;
    if (!isEfi && !isEvoPay) cart.gateway = { ...cart.gateway, copiaCola: codigo };
  }
  const qr = codigo && !isEfi && !isEvoPay ? await QRCode.toBuffer(codigo, { width: 420, margin: 2 }) : null;
  const embedPagamento = embed(
      `Pagamento PIX • ${nome}`,
      [
        `**Pedido:** \`${cart.publicId}\``,
        `**Valor exato:** \`${money(amounts.total)}\``,
        '',
        '**PIX Copia e Cola:**',
        `\`${String(codigo || '').replace(/`/g, '')}\``,
        '',
        `**Valor identificado:** \`${money(amounts.total)}\`${cart.pixSequence ? ` (acréscimo de ${money(cart.pixSequence / 100)})` : ''}`,
        'O pagamento será verificado automaticamente assim que o e-mail bancário chegar.',
        'A entrega só será liberada após a confirmação automática.',
      ].join('\n'),
      guild,
      nome,
    ).setColor(isEfi ? 0x16a085 : isEvoPay ? 0x2563eb : provider === 'interImap' ? 0xff7a00 : 0x820ad1);
  if (qr) embedPagamento.setImage(`attachment://pix-${cart.publicId}.png`);
  return {
    embeds: [embedPagamento],
    files: qr ? [{ attachment: qr, name: `pix-${cart.publicId}.png` }] : [],
    components: [
      new ActionRowBuilder().addComponents(
        button(id('cart-copy-code', cart.id), 'Pix copia e cola', ButtonStyle.Primary, { id: '1192868868784394381', name: 'copiaCola' }),
        ...(isEfi || isEvoPay ? [button(id(isEfi ? 'cart-verify-efi' : 'cart-verify-evopay', cart.id, provider), 'Verificar pagamento', ButtonStyle.Success, '✅')] : []),
        button(id('cart-cancel', cart.id), 'Cancelar', ButtonStyle.Danger),
      ),
    ],
  };
}

function isCartOwner(interaction, cart) {
  return interaction.user.id === cart.userId;
}

function isCartAdmin(interaction, gs) {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  if (gs.botAdmins?.includes(interaction.user.id)) return true;
  const roleIds = interaction.member?.roles?.cache;
  return Boolean(roleIds && [gs.roles?.staff, gs.roles?.manager].filter(Boolean).some((roleId) => roleIds.has(roleId)));
}

async function createCartChannel(interaction, gs, cart) {
  if (interaction.channel?.threads?.create) {
    const thread = await interaction.channel.threads.create({
      name: cartThreadName(cart),
      type: ChannelType.PrivateThread,
      invitable: false,
      autoArchiveDuration: 60,
      reason: `Carrinho Zend ${cart.publicId}`,
    }).catch(() => null);
    if (thread) {
      await thread.members.add(cart.userId).catch(() => null);
      return thread;
    }
  }

  const botId = interaction.client.user.id;
  const overwrites = [
    { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: cart.userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
    { id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
  ];
  for (const roleId of [gs.roles?.staff, gs.roles?.manager].filter(Boolean)) {
    overwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  }
  return interaction.guild.channels.create({
    name: `carrinho-${cartBuyerName(cart)}-${cart.userId}`.toLowerCase(),
    type: ChannelType.GuildText,
    topic: `Carrinho ${cart.publicId} • Cliente ${cart.userId}`,
    permissionOverwrites: overwrites,
    reason: `Carrinho Zend ${cart.publicId}`,
  }).catch(() => null);
}

async function refreshCartMessage(guild, gs, cart, payload = cartPayload(guild, gs, cart)) {
  if (!cart.channelId || !cart.messageId) return false;
  const channel = await guild.channels.fetch(cart.channelId).catch(() => null);
  if (!channel?.isTextBased()) return false;
  const message = await channel.messages.fetch(cart.messageId).catch(() => null);
  if (!message) return false;

  const { editarOuRepostar } = await import('../infraestrutura/resposta-painel.js');
  const updated = await editarOuRepostar(message, payload).catch((err) => {
    console.error('[carrinho] refresh V2:', err.message);
    return null;
  });
  if (updated?.id) cart.messageId = updated.id;
  return Boolean(updated);
}

async function syncSaleMessage(guild, product) {
  if (!product?.salesMessage) return;
  const channel = await guild.channels.fetch(product.salesMessage.channelId).catch(() => null);
  if (!channel?.isTextBased()) return;
  const message = await channel.messages.fetch(product.salesMessage.messageId).catch(() => null);
  if (!message) return;

  const gs = guildState(guild.id);
  const payload = salePayload(product, gs);
  const { editarOuRepostar } = await import('../infraestrutura/resposta-painel.js');
  const updated = await editarOuRepostar(message, payload).catch((err) => {
    console.error('[venda] sync V2:', err.message);
    return null;
  });
  if (updated?.id && updated.id !== product.salesMessage.messageId) {
    product.salesMessage.messageId = updated.id;
    product.salesMessage.channelId = updated.channelId || channel.id;
  }
}

function takeDelivery(field, quantity) {
  if (field.infinite?.enabled) return Array.from({ length: quantity }, () => field.infinite.text || 'Produto com estoque infinito');
  if (stockCount(field) < quantity) throw new Error('Estoque insuficiente para concluir a entrega.');
  const delivered = [];
  while (delivered.length < quantity && field.stock.length) delivered.push(field.stock.shift());
  while (delivered.length < quantity && Number(field.ghostStock?.quantity || 0) > 0) {
    delivered.push(field.ghostStock.value || 'Item de estoque fantasma');
    field.ghostStock.quantity -= 1;
  }
  return delivered;
}

async function removeCartPanel(guild, cart) {
  if (!cart.channelId || !cart.messageId) return false;
  const channel = await guild.channels.fetch(cart.channelId).catch(() => null);
  const message = channel?.messages?.fetch ? await channel.messages.fetch(cart.messageId).catch(() => null) : null;
  if (!message) return false;
  await message.delete(`Painel removido após aprovação ${cart.publicId}`).catch(() => null);
  cart.messageId = null;
  return true;
}

function scheduleCartChannelDeletion(channel, cart, delayMs = 2 * 60 * 1000) {
  if (!channel?.delete) return;
  cart.closeAt = Date.now() + delayMs;
  const timer = setTimeout(() => {
    channel.delete(`Carrinho ${cart.publicId} encerrado após a compra`).catch((error) => {
      console.error(`[carrinho] falha ao fechar ${cart.publicId}:`, error?.message || error);
    });
  }, delayMs);
  timer.unref?.();
}

async function deliverCart(interaction, gs, cart, approverId) {
  if (cart.status === 'DELIVERED') return { ok: false, message: `O carrinho \`${cart.publicId}\` já foi entregue.` };
  if (CART_TERMINAL_STATUSES.has(cart.status)) return { ok: false, message: `O carrinho \`${cart.publicId}\` está ${cartStatusLabel(cart.status).toLowerCase()}.` };
  if (cart.processing) return { ok: false, message: `O carrinho \`${cart.publicId}\` já está sendo processado.` };
  const product = cartProduct(gs, cart);
  const field = cartField(gs, cart);
  if (!product || !field) return { ok: false, message: 'O produto ou a variação deste carrinho não existe mais.' };
  if (availableStock(field) < cart.quantity) return { ok: false, message: 'Não há estoque suficiente para aprovar este carrinho.' };
  cart.processing = true;
  cart.status = 'PROCESSING';
  try {
    const delivered = takeDelivery(field, cart.quantity);
    const at = Date.now();
    cart.orderId ||= `AM_${crypto.randomUUID()}`;
    cart.status = 'DELIVERED';
    cart.approvedAt = at;
    cart.deliveredAt = at;
    cart.approvedBy = approverId;
    cart.delivery = delivered;
    cart.processing = false;
    const coupon = findCartCoupon(product, cart.couponCode);
    if (coupon) coupon.uses = Number(coupon.uses || 0) + 1;
    const purchase = {
      id: crypto.randomUUID(),
      cartId: cart.id,
      publicId: cart.publicId,
      userId: cart.userId,
      productId: product.id,
      fieldId: field.id,
      product: `${product.name} • ${field.name}`,
      quantity: cart.quantity,
      subtotal: cart.subtotal,
      discount: cart.discount,
      amount: cart.total,
      couponCode: cart.couponCode || null,
      paymentMethod: cart.paymentMethod,
      at,
      status: 'DELIVERED',
    };
    gs.purchases.push(purchase);
    gs.stats.salesToday = Number(gs.stats.salesToday || 0) + cart.total;
    gs.stats.salesTotal = Number(gs.stats.salesTotal || 0) + cart.total;
    gs.stats.countToday = Number(gs.stats.countToday || 0) + 1;
    gs.stats.countTotal = Number(gs.stats.countTotal || 0) + 1;
    const userLike = { id: cart.userId, tag: cart.userTag, username: cart.userTag };
    const account = balanceUser(gs, userLike);
    account.spent = Number(account.spent || 0) + cart.total;

    const member = await interaction.guild.members.fetch(cart.userId).catch(() => null);
    if (member) {
      if (field.addRole) await member.roles.add(field.addRole, `Compra ${cart.publicId}`).catch(() => null);
      if (field.removeRole) await member.roles.remove(field.removeRole, `Compra ${cart.publicId}`).catch(() => null);
      if (gs.roles?.client) await member.roles.add(gs.roles.client, `Cliente ${cart.publicId}`).catch(() => null);
    }

    await sendManualApprovalLog(interaction.guild, gs, cart, approverId);

    const dmMessage = await sendBuyerDeliveryDm(member, interaction.guild, gs, cart, product, field, delivered);
    const cartChannel = cart.channelId ? await interaction.guild.channels.fetch(cart.channelId).catch(() => null) : null;
    if (cartChannel?.setName) await cartChannel.setName(cartThreadName(cart, 'delivered')).catch(() => null);
    if (cartChannel?.isTextBased()) {
      const deleteAt = Math.floor((Date.now() + 2 * 60 * 1000) / 1000);
      const row = dmMessage
        ? [new ActionRowBuilder().addComponents(linkButton(`https://discord.com/channels/@me/${dmMessage.channelId}/${dmMessage.id}`, 'Ir para o pedido entregue'))]
        : [];
      await cartChannel.send({
        content: `✅ **Entrega realizada!** Verifique seu privado. Este carrinho será excluído <t:${deleteAt}:R>.`,
        components: row,
      }).catch(() => null);
    }
    scheduleCartChannelDeletion(cartChannel, cart);

    await removeCartPanel(interaction.guild, cart);
    await syncSaleMessage(interaction.guild, product);
    if (availableStock(field) <= 0) await sendOutOfStockLog(interaction.guild, gs, product, field);
    await sendDeliveryLog(interaction.guild, gs, cart);
    return { ok: true, message: `Carrinho \`${cart.publicId}\` aprovado e entregue com sucesso.` };
  } catch (error) {
    cart.processing = false;
    cart.status = 'AWAITING_APPROVAL';
    return { ok: false, message: `Falha ao entregar o carrinho: ${error.message}` };
  }
}

function iniciarVerificacaoAutomaticaImap() {
  if (!client || !state || !saveState) return () => null;
  let executando = false;
  const tick = async () => {
    if (executando || !client.isReady?.()) return;
    executando = true;
    try {
      const guildIds = new Set([
        ...client.guilds.cache.keys(),
        ...Object.keys(state.guilds || {}),
      ]);
      for (const guildId of guildIds) {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) continue;
        const gs = guildState(guildId);
        for (const cart of gs.carts || []) {
          if (cart.status !== 'AWAITING_PAYMENT' || cart.autoChecking) continue;
          const provider = cart.gateway?.provider;
          if (!['interImap', 'nubankImap'].includes(provider)) continue;
          const config = gs.payments?.[provider];
          if (!config?.enabled || !config?.configured) continue;
          console.log(`[imap-auto] verificando ${cart.publicId} (${provider}) no valor ${cartAmounts(gs, cart).total.toFixed(2)}`);
          cart.autoChecking = true;
          try {
            const amounts = cartAmounts(gs, cart);
            const result = await verificarPagamentoImap(config, {
              total: amounts.total,
              since: cart.createdAt,
              usedUids: config.usedUids || [],
            });
            if (!result.paid) {
              console.log(`[imap-auto] nenhum pagamento compatível em ${result.checked || 0} mensagem(ns) para ${cart.publicId}`);
              continue;
            }
            config.usedUids = [...new Set([...(config.usedUids || []), result.uid])].slice(-500);
            cart.gateway = { ...cart.gateway, emailUid: result.uid };
            const channel = cart.channelId ? await guild.channels.fetch(cart.channelId).catch(() => null) : null;
            if (channel?.isTextBased()) await channel.send(`✅ Pagamento confirmado por ${cart.paymentMethod}. Iniciando entrega...`).catch(() => null);
            await deliverCart({ guild, channel }, gs, cart, provider);
            await saveState();
          } catch (error) {
            console.error(`[imap-auto] ${guildId}/${cart.publicId}:`, error?.message || error);
          } finally {
            delete cart.autoChecking;
          }
        }
      }
    } finally {
      executando = false;
    }
  };
  const intervaloMs = Math.max(1_000, Number(process.env.IMAP_POLL_INTERVAL_MS || 2_000));
  const timer = setInterval(() => void tick(), intervaloMs);
  timer.unref?.();
  client.on?.('ready', () => {
    console.log(`[imap-auto] verificador ativo; intervalo ${intervaloMs}ms; guildas ${client.guilds.cache.size}`);
    void tick();
  });
  void tick();
  return () => clearInterval(timer);
}

async function cancelCart(guild, gs, cart, status = 'CANCELLED', reason = 'Cancelado pelo usuário') {
  if (cart.status === 'DELIVERED') return false;
  if (CART_TERMINAL_STATUSES.has(cart.status)) return false;
  cart.status = status;
  cart.cancelReason = reason;
  cart.closedAt = Date.now();
  await removeCartPanel(guild, cart);
  await sendConfiguredLog(guild, gs.channels.orderLogs, {
    embeds: [embed(`Carrinho ${cartStatusLabel(status).toLowerCase()}`, `**Carrinho:** \`${cart.publicId}\`\n**Cliente:** <@${cart.userId}>\n**Motivo:** ${reason}`, guild, 'Logs de pedidos').setColor(0xef4444)],
  });
  const cartChannel = cart.channelId ? await guild.channels.fetch(cart.channelId).catch(() => null) : null;
  if (cartChannel?.isTextBased()) {
    await cartChannel.send(`${"<:yuki_error:1529378857575256175>"} **Compra cancelada.** Este carrinho será excluído em alguns segundos.`).catch(() => null);
    if (cartChannel.setName) await cartChannel.setName(cartThreadName(cart, 'cancelled')).catch(() => null);
    const exclusion = setTimeout(() => cartChannel.delete(`Carrinho ${cart.publicId} cancelado`).catch(() => null), 5_000);
    exclusion.unref?.();
  }
  return true;
}

async function startCart(interaction, gs, product, selectedFieldId = null) {
  if (!gs.channels.orderLogs) {
    return interaction.reply({ content: `${"<:yuki_error:1529378857575256175>"} Ops... o canal de logs pedidos ainda não foi configurado, faça um retorno em breve!`, ephemeral: true });
  }
  if (!hasConfiguredPayment(gs)) {
    return interaction.reply({ content: `${"<:yuki_error:1529378857575256175>"} Ops... a forma de pagamento não foi configurada ainda, faça um retorno em breve!`, ephemeral: true });
  }
  const selectedField = selectedFieldId
    ? product?.fields?.find((item) => item.id === selectedFieldId)
    : null;
  const firstAvailable = selectedField || product?.fields?.find((item) => availableStock(item) > 0);
  if (!product || !firstAvailable) {
    return interaction.reply({ content: `${"<:yuki_error:1529378857575256175>"} Ops... este produto está sem estoque no momento.`, ephemeral: true });
  }
  if (availableStock(firstAvailable) <= 0) {
    return interaction.reply({ content: `${"<:yuki_error:1529378857575256175>"} Esta opção está sem estoque no momento.`, ephemeral: true });
  }
  if (firstAvailable.requiredRole && !interaction.member?.roles?.cache?.has(firstAvailable.requiredRole)) {
    return interaction.reply({ content: `${"<:yuki_error:1529378857575256175>"} Você precisa do cargo <@&${firstAvailable.requiredRole}> para comprar esta variação.`, ephemeral: true });
  }
  const existing = [...gs.carts].reverse().find((item) => item.userId === interaction.user.id && item.productId === product.id && !CART_TERMINAL_STATUSES.has(item.status));
  if (existing) {
    const link = existing.channelId ? `https://discord.com/channels/${interaction.guild.id}/${existing.channelId}` : null;
    return interaction.reply({
      content: `Você já possui o carrinho \`${existing.publicId}\` aberto para este produto.`,
      components: link ? [new ActionRowBuilder().addComponents(linkButton(link, 'Ir para o carrinho', { id: '1518360400977072259', name: 'icons8carrinhodecomprascarregado' }))] : [],
      ephemeral: true,
    });
  }
  const createdAt = Date.now();
  const cart = {
    id: crypto.randomUUID(),
    publicId: cartPublicId(gs),
    userId: interaction.user.id,
    userTag: interaction.user.tag || interaction.user.username,
    userName: interaction.user.username,
    userAvatar: interaction.user.displayAvatarURL({ extension: 'webp', size: 128 }),
    productId: product.id,
    fieldId: firstAvailable.id,
    quantity: Math.max(1, Number(firstAvailable.minQty || 1)),
    couponCode: null,
    paymentMethod: null,
    status: 'OPEN',
    createdAt,
    updatedAt: createdAt,
    expiresAt: createdAt + Math.max(5, Number(gs.cartSettings?.expirationMinutes || 30)) * 60_000,
    channelId: null,
    messageId: null,
    proof: null,
    processing: false,
  };
  cartAmounts(gs, cart);
  gs.carts.push(cart);
  const channel = await createCartChannel(interaction, gs, cart);
  const { prepararMensagem } = await import('../infraestrutura/resposta-painel.js');
  if (channel) {
    cart.channelId = channel.id;
    const sent = await channel.send(prepararMensagem(cartPayload(interaction.guild, gs, cart)));
    cart.messageId = sent.id;
    const link = `https://discord.com/channels/${interaction.guild.id}/${channel.id}`;
    return interaction.reply({
      content: `${"<:yuki_check:1529378856132415609>"} Seu carrinho \`${cart.publicId}\` foi criado!`,
      components: [new ActionRowBuilder().addComponents(linkButton(link, 'Ir para o carrinho', { id: '1518360400977072259', name: 'icons8carrinhodecomprascarregado' }))],
      ephemeral: true,
    });
  }
  // Sem canal: responde V2 ephemeral (sem content — regra do Components V2)
  const v2 = cartPayload(interaction.guild, gs, cart);
  return interaction.reply(
    prepararMensagem({
      ...v2,
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    }),
  );
}

async function handleCartButton(interaction, gs, action, cartId) {
  const cart = getCart(gs, cartId);
  const guild = interaction.guild;
  if (!cart) return interaction.reply({ content: 'Carrinho não encontrado.', ephemeral: true });
  if (action === 'cart-admin-approve') {
    if (!isCartAdmin(interaction, gs)) return interaction.reply({ content: 'Você não possui permissão para aprovar este carrinho.', ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    await interaction.channel?.send(`${"<:yuki_check:1529378856132415609>"} | Pagamento aprovado manualmente. Aguarde...`).catch(() => null);
    const result = await deliverCart(interaction, gs, cart, interaction.user.id);
    return interaction.editReply({ content: result.message });
  }
  if (action === 'cart-admin-decline') {
    if (!isCartAdmin(interaction, gs)) return interaction.reply({ content: 'Você não possui permissão para recusar este carrinho.', ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    const changed = await cancelCart(guild, gs, cart, 'DECLINED', `Pagamento recusado por ${interaction.user.tag || interaction.user.username}`);
    return interaction.editReply({ content: changed ? `Carrinho \`${cart.publicId}\` recusado.` : 'Este carrinho já foi encerrado.' });
  }
  if (!isCartOwner(interaction, cart) && !isCartAdmin(interaction, gs)) {
    return interaction.reply({ content: 'Este carrinho não pertence a você.', ephemeral: true });
  }
  if (action === 'cart-quantity') {
    if (!CART_EDITABLE_STATUSES.has(cart.status)) return interaction.reply({ content: 'Este carrinho não pode mais ser editado.', ephemeral: true });
    return interaction.showModal(modal(id('modal-cart-quantity', cart.id), 'Alterar Quantidade', [
      textInput('quantity', 'QUANTIDADE', 'Insira a quantia que deseja comprar, exemplo: 3', TextInputStyle.Short, true, String(cart.quantity || 1)),
    ]));
  }
  if (action === 'cart-qty-label') return interaction.deferUpdate();
  if (action === 'cart-qty-down' || action === 'cart-qty-up') {
    if (!CART_EDITABLE_STATUSES.has(cart.status)) return interaction.reply({ content: 'Este carrinho não pode mais ser editado.', ephemeral: true });
    const field = cartField(gs, cart);
    const limits = clampCartQuantity(cart, field);
    cart.quantity = action === 'cart-qty-up' ? Math.min(limits.max, cart.quantity + 1) : Math.max(limits.min, cart.quantity - 1);
    cart.updatedAt = Date.now();
    cartAmounts(gs, cart);
    return interaction.update(cartPayload(guild, gs, cart));
  }
  if (action === 'cart-coupon') {
    return interaction.showModal(modal(id('modal-cart-coupon', cart.id), 'Usar Cupom', [
      textInput('code', 'CÓDIGO DO CUPOM', 'Digite o código do cupom', TextInputStyle.Short, true, cart.couponCode || ''),
    ]));
  }
  if (action === 'cart-coupon-remove') {
    cart.couponCode = null;
    cartAmounts(gs, cart);
    return interaction.update(cartPayload(guild, gs, cart));
  }
  if (action === 'cart-checkout') {
    const field = cartField(gs, cart);
    if (!field || availableStock(field) < cart.quantity) return interaction.reply({ content: `${"<:yuki_error:1529378857575256175>"} Estoque insuficiente para esta quantidade.`, ephemeral: true });
    if (field.requiredRole && !interaction.member?.roles?.cache?.has(field.requiredRole)) {
      return interaction.reply({ content: `${"<:yuki_error:1529378857575256175>"} Você precisa do cargo <@&${field.requiredRole}> para concluir esta compra.`, ephemeral: true });
    }
    cart.status = 'PAYMENT_SELECTION';
    cart.updatedAt = Date.now();
    cartAmounts(gs, cart);
    return interaction.update(paymentPayload(guild, gs, cart));
  }
  if (action === 'cart-edit') {
    if (CART_TERMINAL_STATUSES.has(cart.status)) return interaction.reply({ content: 'Este carrinho já foi encerrado.', ephemeral: true });
    cart.status = 'OPEN';
    cart.paymentMethod = null;
    cart.proof = null;
    cart.updatedAt = Date.now();
    return interaction.update(cartPayload(guild, gs, cart));
  }
  if (action === 'cart-pay-card') {
    return interaction.reply({ content: '💳 O pagamento por cartão ainda não possui um gateway configurado.', ephemeral: true });
  }
  if (action === 'cart-pay-manual') {
    if (!hasConfiguredManualPix(gs)) return interaction.reply({ content: 'O pagamento manual não está disponível ou está sem uma chave Pix válida.', ephemeral: true });
    cart.paymentMethod = 'Pagamento Manual';
    cart.status = 'AWAITING_MANUAL_PAYMENT';
    cart.updatedAt = Date.now();
    cartAmounts(gs, cart);
    await sendOrderRequestedLog(guild, gs, cart);
    await interaction.deferUpdate();
    await interaction.message.delete().catch(() => null);
    const sent = await interaction.channel?.send(await manualPaymentPayload(guild, gs, cart)).catch(() => null);
    if (sent) cart.messageId = sent.id;
    if (interaction.channel?.setName) await interaction.channel.setName(cartThreadName(cart, 'paid')).catch(() => null);
    return;
  }
  if (action === 'cart-pay-efi' || action === 'cart-pay-evopay') {
    const isEvoPay = action === 'cart-pay-evopay';
    const provider = isEvoPay ? 'evopay' : 'efi';
    const config = gs.payments?.efi;
    const gatewayConfig = gs.payments?.[provider];
    if (!gatewayConfig?.enabled || !gatewayConfig?.configured) return interaction.reply({ content: `${isEvoPay ? 'A EvoPay Cash' : 'A Efí Bank'} não está habilitada ou validada.`, ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    try {
      const amounts = cartAmounts(gs, cart);
      cart.gateway = { provider, ...(isEvoPay ? await criarCobrancaEvoPay(gatewayConfig, cart, amounts.total) : await criarCobrancaEfi(config, cart, amounts.total)) };
      cart.paymentMethod = isEvoPay ? 'EvoPay Cash' : 'Efí Bank';
      cart.status = 'AWAITING_PAYMENT';
      cart.updatedAt = Date.now();
      await sendOrderRequestedLog(guild, gs, cart);
      await interaction.message.delete().catch(() => null);
      const sent = await interaction.channel?.send(await pagamentoAutomaticoPayload(guild, gs, cart, provider));
      if (sent) cart.messageId = sent.id;
      return interaction.editReply({ content: '✅ Cobrança PIX criada com segurança.' });
    } catch (error) {
      return interaction.editReply({ content: `❌ Não foi possível criar a cobrança Efí: ${String(error?.message || error).slice(0, 500)}` });
    }
  }
  if (action === 'cart-pay-inter' || action === 'cart-pay-nubank') {
    const provider = action === 'cart-pay-inter' ? 'interImap' : 'nubankImap';
    const config = gs.payments?.[provider];
    if (!config?.enabled || !config?.configured) return interaction.reply({ content: 'Esta forma de pagamento não está habilitada ou validada.', ephemeral: true });
    cart.gateway = { provider };
    cart.paymentMethod = provider === 'interImap' ? 'Banco Inter (IMAP)' : 'Nubank (IMAP)';
    atribuirPixTotal(gs, cart, provider);
    cart.status = 'AWAITING_PAYMENT';
    cart.updatedAt = Date.now();
    cartAmounts(gs, cart);
    await sendOrderRequestedLog(guild, gs, cart);
    await interaction.deferUpdate();
    await interaction.message.delete().catch(() => null);
    const sent = await interaction.channel?.send(await pagamentoAutomaticoPayload(guild, gs, cart, provider));
    if (sent) cart.messageId = sent.id;
    return;
  }
  if (action === 'cart-verify-efi' || action === 'cart-verify-evopay') {
    const isEvoPay = action === 'cart-verify-evopay';
    const transactionId = isEvoPay ? cart.gateway?.transactionId : cart.gateway?.txid;
    if (!transactionId) return interaction.reply({ content: 'Cobrança não encontrada neste carrinho.', ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    try {
      const result = isEvoPay ? await consultarCobrancaEvoPay(gs.payments.evopay, transactionId) : await consultarCobrancaEfi(gs.payments.efi, transactionId);
      if (!result.paid) return interaction.editReply({ content: `⏳ Pagamento ainda não confirmado. Status: \`${result.status || 'ATIVA'}\`.` });
      await interaction.channel?.send(`✅ Pagamento confirmado pela ${isEvoPay ? 'EvoPay Cash' : 'Efí Bank'}. Iniciando entrega...`).catch(() => null);
      const delivery = await deliverCart(interaction, gs, cart, isEvoPay ? 'evopay' : 'efi');
      return interaction.editReply({ content: delivery.message });
    } catch (error) {
      return interaction.editReply({ content: `❌ Falha ao consultar a Efí: ${String(error?.message || error).slice(0, 500)}` });
    }
  }
  if (action === 'cart-verify-imap') {
    const provider = cart.gateway?.provider;
    const config = gs.payments?.[provider];
    if (!['interImap', 'nubankImap'].includes(provider) || !config) return interaction.reply({ content: 'Configuração IMAP não encontrada.', ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    try {
      const amounts = cartAmounts(gs, cart);
      const result = await verificarPagamentoImap(config, {
        total: amounts.total,
        since: cart.createdAt,
        usedUids: config.usedUids || [],
      });
      if (!result.paid) return interaction.editReply({ content: '⏳ Nenhuma confirmação bancária válida com o valor exato foi encontrada.' });
      config.usedUids = [...new Set([...(config.usedUids || []), result.uid])].slice(-500);
      cart.gateway = { ...cart.gateway, emailUid: result.uid };
      await interaction.channel?.send(`✅ Pagamento confirmado por ${cart.paymentMethod}. Iniciando entrega...`).catch(() => null);
      const delivery = await deliverCart(interaction, gs, cart, provider);
      return interaction.editReply({ content: delivery.message });
    } catch (error) {
      return interaction.editReply({ content: `❌ Falha ao verificar o e-mail bancário: ${String(error?.message || error).slice(0, 500)}` });
    }
  }
  if (action === 'cart-copy-code') {
    const codigo = pixCopyPasteCode(gs, cart).replace(/[\r\n`]/g, '').trim();
    if (!codigo) return interaction.reply({ content: 'Não foi possível gerar o código PIX deste carrinho.', ephemeral: true });
    return interaction.reply({ content: codigo, ephemeral: true });
  }
  if (action === 'cart-confirm-payment') {
    if (!isCartAdmin(interaction, gs)) return interaction.reply({ content: 'Apenas a equipe pode confirmar manualmente este pagamento.', ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    await interaction.message.delete().catch(() => null);
    await interaction.channel?.send(`${"<:yuki_check:1529378856132415609>"} | Pagamento aprovado manualmente. Aguarde...`).catch(() => null);
    const result = await deliverCart(interaction, gs, cart, interaction.user.id);
    return interaction.editReply({ content: result.message });
  }
  if (action === 'cart-pay-mercado') {
    const method = 'Mercado Pago (teste)';
    cart.paymentMethod = method;
    cart.proof = 'Pagamento simulado em ambiente de teste — nenhuma cobrança foi realizada.';
    cart.status = 'AWAITING_APPROVAL';
    cart.updatedAt = Date.now();
    await interaction.update({
      embeds: [embed(`${"<a:loadinggenesiss:1518360409843957790>"} Pagamento de teste`, `Nenhuma cobrança real foi feita. O carrinho \`${cart.publicId}\` aguarda aprovação manual com \`/entregar\`.`, guild, method).setColor(0xf59e0b)],
      components: [new ActionRowBuilder().addComponents(button(id('cart-cancel', cart.id), 'Cancelar', ButtonStyle.Danger, { id: '1518360408187207681', name: 'lixeiraRed' }))],
    });
    await sendApprovalLog(guild, gs, cart);
    return;
  }
  if (action === 'cart-proof') {
    return interaction.showModal(modal(id('modal-cart-proof', cart.id), 'Enviar comprovante', [
      textInput('proof', 'COMPROVANTE OU REFERÊNCIA*', 'Cole o link, ID ou descreva o comprovante', TextInputStyle.Paragraph),
    ]));
  }
  if (action === 'cart-cancel') {
    await interaction.deferUpdate();
    const changed = await cancelCart(guild, gs, cart, 'CANCELLED', `Cancelado por ${interaction.user.tag || interaction.user.username}`);
    if (!changed) await interaction.followUp({ content: 'Este carrinho já foi encerrado.', ephemeral: true });
    return;
  }
  return interaction.reply({ content: 'Ação de carrinho indisponível.', ephemeral: true });
}

  return {
    CART_TERMINAL_STATUSES,
    CART_EDITABLE_STATUSES,
    cartPublicId,
    getCart,
    cartProduct,
    cartField,
    availableStock,
    clampCartQuantity,
    findCartCoupon,
    cartAmounts,
    cartStatusLabel,
    cartBuyerName,
    cartThreadName,
    cartItemName,
    cartItemsText,
    cartSummaryContainer,
    paymentSummaryContainer,
    hasConfiguredPayment,
    hasConfiguredManualPix,
    pixCopyPasteCode,
    gerarPixCopiaCola,
    cartEmbed,
    cartComponents,
    cartPayload,
    paymentPayload,
    manualPaymentPayload,
    isCartOwner,
    isCartAdmin,
    createCartChannel,
    refreshCartMessage,
    syncSaleMessage,
    takeDelivery,
    deliverCart,
    cancelCart,
    startCart,
    handleCartButton,
    iniciarVerificacaoAutomaticaImap,
  };
}
