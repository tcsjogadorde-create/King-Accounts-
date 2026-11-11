import { tratarModalAutomacoes } from '../automacoes/interacoes-automacoes.js';
import { tratarModalOutrasAutomacoes } from '../automacoes/interacoes-outras-automacoes.js';
import { notificarRestock } from '../automacoes/servico-automacoes.js';
import { gerarProdutoComIA, responderTicketComIA, testarConexaoGemini } from '../infraestrutura/gemini-ai.js';
import { GEMINI_MODEL, atualizarVariaveisEnv } from '../configuracoes/ambiente.js';
import { saveState } from '../database/estado.js';
export function criarHandlerModais(ctx) {
  const {
    ActionRowBuilder,
    ButtonStyle,
    CART_EDITABLE_STATUSES,
    EMOJI,
    EmbedBuilder,
    StringSelectMenuBuilder,
    TextInputStyle,
    antiFakePanel,
    automationFeaturePanel,
    availableStock,
    badgesPanel,
    button,
    cartAmounts,
    cartField,
    cartPayload,
    cartProduct,
    channelSelectRow,
    clampCartQuantity,
    conditionsPanel,
    couponsPanel,
    customDetailPanel,
    draftProductPanel,
    embed,
    fieldPanel,
    fieldsPanel,
    findCartCoupon,
    finishGiveaway,
    gatewayPaymentPanel,
    getCart,
    getField,
    getProduct,
    giveawayChannelPanel,
    giveawayDetailPanel,
    giveawayDurationPanel,
    giveawayManagePanel,
    giveawayMessagePayload,
    id,
    isCartAdmin,
    isCartOwner,
    linkButton,
    manualPaymentPanel,
    modal,
    money,
    moveBalance,
    oauthConfigPanel,
    oauthPanel,
    parseDuration,
    parseHex,
    parsePrice,
    positionPanel,
    productPanel,
    protectDetailPanel,
    protectMessagePanel,
    protectSelfBotPanel,
    refreshCartMessage,
    repostPanel,
    rolesConfigPanel,
    rolesFieldPanel,
    sendApprovalLog,
    sendConfiguredLog,
    sendOrUpdate,
    stockPanel,
    storeCouponsPanel,
    storeOauthPanel,
    syncSaleMessage,
    tempRolePanel,
    textInput,
    ticketFunctionDetailPanel,
    ticketFunctionsPanel,
    ticketHoursPanel,
    ticketPanel,
    userDraft,
    welcomePanel,
  } = ctx;

  return async function handleModal(interaction, gs) {
  const [, action, a, b, c] = interaction.customId.split(':');
  const guild = interaction.guild;
  const product = getProduct(gs, a);
  const field = getField(product, b);
  const get = (name) => interaction.fields.getTextInputValue(name)?.trim();

  if (action.startsWith('modal-protect') && !isCartAdmin(interaction, gs)) {
    return interaction.reply({ content: '❌ | Apenas a equipe autorizada pode alterar as proteções do servidor.', ephemeral: true });
  }
  if (await tratarModalAutomacoes(interaction, gs, action, a, b, get)) return;
  if (await tratarModalOutrasAutomacoes(interaction, gs, action, a, b, get)) return;

  switch (action) {
    case 'modal-ia-gerar-produto': {
      await interaction.deferReply({ ephemeral: true });
      const promptText = get('prompt');
      if (!promptText) return interaction.editReply({ content: '❌ Por favor informe a descrição do produto.' });

      try {
        const pData = await gerarProdutoComIA(promptText, gs);
        const prodId = crypto.randomUUID();

        const newProduct = {
          id: prodId,
          name: pData.name || 'Produto Gerado por IA',
          description: pData.description || 'Descrição gerada por IA',
          price: Number(pData.price) || 10.0,
          category: pData.category || 'Geral',
          terms: pData.terms || 'Respeite as regras da loja.',
          banner: pData.banner || '',
          icon: pData.icon || '',
          autoDelivery: true,
          coupons: [],
          salesMessage: null,
          postedMessages: [],
          fields: (pData.fields || []).map((f) => ({
            id: crypto.randomUUID(),
            name: f.name || 'Padrão',
            price: Number(f.price) || Number(pData.price) || 10.0,
            description: f.description || '',
            emoji: '📦',
            stock: (pData.stockItems || []).map((item) => ({ id: crypto.randomUUID(), content: item, addedAt: Date.now() })),
          })),
        };

        if (!newProduct.fields.length) {
          newProduct.fields.push({
            id: crypto.randomUUID(),
            name: 'Padrão',
            price: newProduct.price,
            description: 'Opção principal',
            emoji: '📦',
            stock: (pData.stockItems || []).map((item) => ({ id: crypto.randomUUID(), content: item, addedAt: Date.now() })),
          });
        }

        gs.products ??= [];
        gs.products.push(newProduct);
        await saveState();

        const panelPayload = productPanel(guild, newProduct);
        return interaction.editReply({
          content: `✅ **Produto \`${newProduct.name}\` criado com sucesso via Gemini IA!**\nUse os botões abaixo para gerenciar campos, adicionar estoque ou colocar à venda:`,
          ...panelPayload,
        });
      } catch (err) {
        return interaction.editReply({ content: `❌ Erro ao gerar produto com Gemini AI: ${err.message}` });
      }
    }

    case 'modal-ia-resposta-ticket': {
      await interaction.deferReply({ ephemeral: false });
      const duvida = get('duvida');

      try {
        let msgs = [];
        if (interaction.channel?.messages) {
          const fetched = await interaction.channel.messages.fetch({ limit: 10 }).catch(() => null);
          if (fetched) {
            msgs = fetched.reverse().map((m) => `${m.author.username}: ${m.content}`).filter((line) => line.length > 5);
          }
        }

        const respostaIA = await responderTicketComIA(duvida || 'Como funciona o atendimento nesta loja?', msgs, gs);
        return interaction.editReply({
          embeds: [
            embed(
              '🤖 Resposta do Suporte Inteligente (Gemini)',
              respostaIA,
              guild,
              'Suporte IA',
            ),
          ],
        });
      } catch (err) {
        return interaction.editReply({ content: `❌ Erro ao gerar resposta do ticket: ${err.message}` });
      }
    }

    case 'modal-ia-config': {
      await interaction.deferReply({ ephemeral: true });
      const chave = get('chave');
      const modelo = get('modelo');

      try {
        const atualizacoes = {};
        if (chave) atualizacoes.GEMINI_API_KEY = chave.trim();
        if (modelo) atualizacoes.GEMINI_MODEL = modelo.trim();
        if (Object.keys(atualizacoes).length) atualizarVariaveisEnv(atualizacoes);

        const status = await testarConexaoGemini();
        return interaction.editReply({
          embeds: [
            embed(
              '🤖 Configuração da Gemini AI',
              [
                `• **Status da Conexão:** \`${status}\``,
                `• **Modelo Atual:** \`${process.env.GEMINI_MODEL || GEMINI_MODEL}\``,
                `• **Chave de API:** \`${process.env.GEMINI_API_KEY ? 'Configurada' : 'Não configurada'}\``,
              ].join('\n'),
              guild,
              'IA',
            ),
          ],
        });
      } catch (err) {
        return interaction.editReply({ content: `❌ Erro ao salvar configurações de IA: ${err.message}` });
      }
    }

    case 'modal-cart-quantity': {
      const cart = getCart(gs, a);
      if (!cart) return interaction.reply({ content: 'Carrinho não encontrado.', ephemeral: true });
      if (!isCartOwner(interaction, cart) && !isCartAdmin(interaction, gs)) return interaction.reply({ content: 'Este carrinho não pertence a você.', ephemeral: true });
      if (!CART_EDITABLE_STATUSES.has(cart.status)) return interaction.reply({ content: 'Este carrinho não pode mais ser editado.', ephemeral: true });
      const quantity = Math.floor(Number(get('quantity')));
      const fieldRef = cartField(gs, cart);
      const stock = availableStock(fieldRef);
      if (!Number.isFinite(quantity) || quantity < 1) return interaction.reply({ content: `${"<:yuki_error:1529378857575256175>"} Quantidade inválida.`, ephemeral: true });
      if (Number.isFinite(stock) && quantity > stock) return interaction.reply({ content: `${"<:yuki_error:1529378857575256175>"} Ops... a quantidade solicitada ultrapassa o estoque disponível.`, ephemeral: true });
      const limits = clampCartQuantity({ ...cart, quantity }, fieldRef);
      cart.quantity = Math.max(limits.min, Math.min(quantity, limits.max));
      cart.updatedAt = Date.now();
      cartAmounts(gs, cart);
      await refreshCartMessage(guild, gs, cart);
      return interaction.reply({ content: `${"<:yuki_check:1529378856132415609>"} | Quantidade alterada para \`${cart.quantity}\`.`, ephemeral: true });
    }
    case 'modal-cart-coupon': {
      const cart = getCart(gs, a);
      if (!cart) return interaction.reply({ content: 'Carrinho não encontrado.', ephemeral: true });
      if (!isCartOwner(interaction, cart) && !isCartAdmin(interaction, gs)) return interaction.reply({ content: 'Este carrinho não pertence a você.', ephemeral: true });
      if (!CART_EDITABLE_STATUSES.has(cart.status)) return interaction.reply({ content: 'Este carrinho não pode mais ser editado.', ephemeral: true });
      const cartProductRef = cartProduct(gs, cart);
      const coupon = findCartCoupon(cartProductRef, get('code'));
      if (!coupon) return interaction.reply({ content: `${"<:yuki_error:1529378857575256175>"} Cupom inválido para este produto.`, ephemeral: true });
      if (coupon.quantity && Number(coupon.uses || 0) >= Number(coupon.quantity)) return interaction.reply({ content: `${"<:yuki_error:1529378857575256175>"} Este cupom atingiu o limite de usos.`, ephemeral: true });
      cart.couponCode = coupon.code;
      cart.updatedAt = Date.now();
      cartAmounts(gs, cart);
      await refreshCartMessage(guild, gs, cart);
      return interaction.reply({ content: `${"<:yuki_check:1529378856132415609>"} | Cupom \`${coupon.code}\` aplicado.`, ephemeral: true });
    }
    case 'modal-cart-proof': {
      const cart = getCart(gs, a);
      if (!cart) return interaction.reply({ content: 'Carrinho não encontrado.', ephemeral: true });
      if (!isCartOwner(interaction, cart) && !isCartAdmin(interaction, gs)) return interaction.reply({ content: 'Este carrinho não pertence a você.', ephemeral: true });
      cart.proof = get('proof');
      cart.paymentMethod ||= 'Pagamento Manual';
      cart.status = 'AWAITING_APPROVAL';
      cart.updatedAt = Date.now();
      cartAmounts(gs, cart);
      await refreshCartMessage(guild, gs, cart, {
        embeds: [embed(`${"<a:loadinggenesiss:1518360409843957790>"} Comprovante enviado • ${cart.publicId}`, 'A equipe recebeu o comprovante e precisa confirmar o pagamento para iniciar a entrega.', guild, 'Aguardando aprovação').setColor(0xf59e0b)],
        components: [new ActionRowBuilder().addComponents(button(id('cart-cancel', cart.id), 'Cancelar', ButtonStyle.Danger, { id: '1518360408187207681', name: 'lixeiraRed' }))],
      });
      await sendApprovalLog(guild, gs, cart);
      return interaction.reply({ content: `${"<:yuki_check:1529378856132415609>"} | Comprovante enviado. Aguarde a aprovação da equipe.`, ephemeral: true });
    }
    case 'modal-product-name': {
      const draft = { name: get('name'), description: '', autoDelivery: true, icon: '', banner: '' };
      userDraft(interaction.user.id).product = draft;
      return sendOrUpdate(interaction, draftProductPanel(guild, draft));
    }
    case 'modal-draft-desc': {
      const draft = userDraft(interaction.user.id).product;
      draft.description = get('description');
      return sendOrUpdate(interaction, draftProductPanel(guild, draft));
    }
    case 'modal-draft-banner': {
      const draft = userDraft(interaction.user.id).product;
      draft.banner = get('url');
      return sendOrUpdate(interaction, draftProductPanel(guild, draft));
    }
    case 'modal-draft-icon': {
      const draft = userDraft(interaction.user.id).product;
      draft.icon = get('url');
      return sendOrUpdate(interaction, draftProductPanel(guild, draft));
    }
    case 'modal-product-edit':
      product.name = get('name');
      product.description = get('description');
      product.autoDelivery = /^s/i.test(get('autoDelivery'));
      product.icon = get('icon');
      product.banner = get('banner');
      await syncSaleMessage(guild, product);
      return sendOrUpdate(interaction, productPanel(guild, product));
    case 'modal-field-new':
      product.fields.push({
        id: crypto.randomUUID(),
        name: get('name'),
        description: get('description'),
        price: parsePrice(get('price')),
        stock: [],
        ghostStock: null,
        infinite: { enabled: false, text: '' },
        instructions: { enabled: false, description: '' },
      });
      await syncSaleMessage(guild, product);
      return sendOrUpdate(interaction, fieldsPanel(guild, product));
    case 'modal-field-edit':
      field.name = get('name');
      field.price = parsePrice(get('price'));
      field.description = get('description');
      await syncSaleMessage(guild, product);
      return sendOrUpdate(interaction, fieldPanel(guild, product, field));
    case 'modal-role-id':
      if (c === 'add') field.addRole = get('roleId');
      else field.removeRole = get('roleId');
      return sendOrUpdate(interaction, rolesFieldPanel(guild, product, field));
    case 'modal-cond-role':
      field.requiredRole = get('roleId');
      return sendOrUpdate(interaction, conditionsPanel(guild, product, field));
    case 'modal-cond-min':
      field.minQty = Number(get('value')) || 0;
      return sendOrUpdate(interaction, conditionsPanel(guild, product, field));
    case 'modal-cond-max':
      field.maxQty = Number(get('value')) || 0;
      return sendOrUpdate(interaction, conditionsPanel(guild, product, field));
    case 'modal-stock-add': {
      const items = get('stock').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
      if (/^s/i.test(get('shuffle'))) {
        for (let i = items.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [items[i], items[j]] = [items[j], items[i]];
        }
      }
      userDraft(interaction.user.id).stockAdd = { productId: product.id, fieldId: field.id, items };
      return sendOrUpdate(interaction, {
        embeds: [
          embed(
            `Total de ${items.length} itens detectados`,
            [
              `Cada item será adicionado como um produto no estoque de \`${field.name}\`, exemplo:`,
              `\`${items.slice(0, 3).map((item, i) => `${i + 1}・${item}`).join(' ')}\``,
              'Esse valor será entregue como **uma** unidade para o cliente.',
              `**Deseja adicionar o valor de \`${items.length}\` itens ao estoque de \`${field.name}\`?**`,
              ':infogenesiss: Caso deseje adicionar esse valor como somente um item, adicione uma vírgula no delimitador.',
            ].join('\n'),
            guild,
          ),
        ],
        components: [
          new ActionRowBuilder().addComponents(
            button(id('stock-confirm', product.id, field.id), 'Sim', ButtonStyle.Success, '📤'),
            button(id('stock-delimiter', product.id, field.id), 'Definir delimitador', ButtonStyle.Secondary, '🧩'),
            button(id('stock', product.id, field.id), 'Cancelar', ButtonStyle.Danger, { id: '1529378867314167882', name: 'yuki_back' }),
          ),
        ],
      });
    }
    case 'modal-stock-delimiter': {
      const draft = userDraft(interaction.user.id).stockAdd;
      const delimiter = get('delimiter') || ',';
      draft.items = draft.items.join('\n').split(delimiter).map((x) => x.trim()).filter(Boolean);
      return interaction.reply({ content: `Delimitador definido. ${draft.items.length} itens detectados.`, ephemeral: true });
    }
    case 'modal-stock-ghost':
      field.ghostStock = { quantity: Number(get('quantity')) || 0, value: get('value') };
      field.lastRestock = Date.now();
      await syncSaleMessage(guild, product);
      await notificarRestock(guild, gs, product, field, field.ghostStock.quantity);
      return sendOrUpdate(interaction, stockPanel(guild, product, field));
    case 'modal-stock-infinite':
      field.infinite = { enabled: true, text: get('text') };
      field.lastRestock = Date.now();
      await syncSaleMessage(guild, product);
      await notificarRestock(guild, gs, product, field, 'Estoque infinito');
      return sendOrUpdate(interaction, stockPanel(guild, product, field));
    case 'modal-instructions':
      field.instructions = { enabled: /^s/i.test(get('enabled')), description: get('description') };
      return sendOrUpdate(interaction, fieldPanel(guild, product, field));
    case 'modal-coupon-new': {
      if (!product) return interaction.reply({ content: `${"<:yuki_error:1529378857575256175>"} Produto não encontrado.`, ephemeral: true });
      const code = get('code').toUpperCase();
      const discount = Number(get('discount'));
      if (!code) return interaction.reply({ content: `${"<:yuki_error:1529378857575256175>"} Informe o código do cupom.`, ephemeral: true });
      if (!Number.isFinite(discount) || discount <= 0 || discount > 100) {
        return interaction.reply({ content: `${"<:yuki_error:1529378857575256175>"} Informe um desconto entre 1 e 100.`, ephemeral: true });
      }
      product.coupons ??= [];
      if (product.coupons.some((item) => item.code === code)) {
        return interaction.reply({ content: `${"<:yuki_error:1529378857575256175>"} O cupom \`${code}\` já existe neste produto.`, ephemeral: true });
      }
      const coupon = {
        id: crypto.randomUUID(),
        code,
        discount,
        validity: get('validity'),
        quantity: null,
        maxUses: null,
        uses: 0,
        conditions: [],
      };
      product.coupons.push(coupon);
      return sendOrUpdate(interaction, couponsPanel(guild, product));
    }
    case 'modal-coupon-advanced': {
      const coupon = product.coupons.find((item) => item.id === b);
      coupon.maxUses = get('maxUses') || null;
      coupon.quantity = get('quantity') || null;
      coupon.conditions = [];
      if (get('requiredRole')) coupon.conditions.push(`Cargo necessário <@&${get('requiredRole')}>`);
      if (get('minQty')) coupon.conditions.push(`Comprar no mínimo ${get('minQty')} unidades`);
      if (get('maxQty')) coupon.conditions.push(`Comprar no máximo ${get('maxQty')} unidades`);
      return sendOrUpdate(interaction, couponsPanel(guild, product));
    }
    case 'modal-sell':
      product.saleColor = get('color') || '#FFFFFF';
      if (product.fields.length > 1) {
        return sendOrUpdate(interaction, {
          content: 'Selecione o canal onde quer postar a mensagem com o menu de campos.',
          components: [channelSelectRow(id('sell-channel', product.id))],
        });
      }
      product.saleEmoji = get('emoji') || "<:carrinhoZend:1518282439712309268>" || '🛒';
      product.saleLabel = get('label') || 'Comprar';
      return sendOrUpdate(interaction, {
        content: '**Estilo do botão**\nEscolha a cor do botão de compra. Padrão: verde.',
        components: [new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(id('sell-style', product.id))
            .setPlaceholder('Selecione a cor do botão')
            .addOptions(
              { label: 'Verde', description: 'Padrão recomendado para o botão de compra.', value: 'Verde', default: true },
              { label: 'Azul', description: 'Estilo primário em azul.', value: 'Azul' },
              { label: 'Cinza', description: 'Estilo neutro em cinza.', value: 'Cinza' },
              { label: 'Vermelho', description: 'Estilo de destaque em vermelho.', value: 'Vermelho' },
            ),
        )],
      });
    case 'modal-welcome-message':
      gs.welcome.message = get('message');
      return sendOrUpdate(interaction, welcomePanel(guild, gs));
    case 'modal-welcome-autodelete':
      gs.welcome.autoDeleteSeconds = Number(get('seconds')) || 0;
      return sendOrUpdate(interaction, welcomePanel(guild, gs));
    case 'modal-welcome-image':
      gs.welcome.image = get('url');
      return sendOrUpdate(interaction, welcomePanel(guild, gs));
    case 'modal-welcome-color':
      gs.welcome.color = get('color');
      return sendOrUpdate(interaction, welcomePanel(guild, gs));
    case 'modal-welcome-title':
      gs.welcome.title = get('title');
      return sendOrUpdate(interaction, welcomePanel(guild, gs));
    case 'modal-repost-time':
      gs.automations.repost.time = get('time');
      return sendOrUpdate(interaction, repostPanel(guild, gs));
    case 'modal-ticket-appearance':
      gs.ticket.title = get('title');
      gs.ticket.description = get('description');
      gs.ticket.banner = get('banner');
      gs.ticket.color = get('color') || '#FFFFFF';
      return sendOrUpdate(interaction, ticketPanel(guild, gs));
    case 'modal-ticket-function':
      gs.ticket.functions.push({
        id: crypto.randomUUID(),
        name: get('name'),
        preDescription: get('preDescription'),
        description: get('description'),
        banner: get('banner'),
        emoji: get('emoji') || '📋',
        purchaseDetection: true,
      });
      return sendOrUpdate(interaction, ticketFunctionsPanel(guild, gs));
    case 'modal-ticket-function-edit': {
      const fn = gs.ticket.functions.find((item) => item.id === a);
      if (!fn) return sendOrUpdate(interaction, ticketFunctionsPanel(guild, gs));
      fn.name = get('name');
      fn.preDescription = get('preDescription');
      fn.description = get('description');
      fn.banner = get('banner');
      fn.emoji = get('emoji') || '📋';
      return sendOrUpdate(interaction, ticketFunctionDetailPanel(guild, fn));
    }
    case 'modal-giveaway-new':
      userDraft(interaction.user.id).giveaway = {
        title: get('title'),
        description: get('description'),
        winners: Math.max(1, Math.min(20, Number(get('winners')) || 1)),
        creatorId: interaction.user.id,
        durationMs: null,
        channelId: null,
        allowedRoles: [],
        blockedRoles: [],
        extraEntries: {},
      };
      return sendOrUpdate(interaction, giveawayDurationPanel(guild, userDraft(interaction.user.id).giveaway));
    case 'modal-giveaway-duration': {
      const duration = parseDuration(get('duration'));
      if (duration < 60_000 || duration > 30 * 24 * 60 * 60 * 1000) {
        return interaction.reply({ content: 'Use um tempo entre `1m` e `30d`.', ephemeral: true });
      }
      const draft = userDraft(interaction.user.id).giveaway;
      draft.durationMs = duration;
      return sendOrUpdate(interaction, giveawayChannelPanel(guild, draft));
    }
    case 'modal-giveaway-force': {
      const giveaway = gs.giveaways.find((item) => item.id === a);
      if (!giveaway || get('confirmation').toUpperCase() !== 'SIM') return interaction.reply({ content: 'Finalização cancelada.', ephemeral: true });
      await finishGiveaway(guild, giveaway);
      return sendOrUpdate(interaction, giveawayManagePanel(guild, gs));
    }
    case 'modal-giveaway-add-time': {
      const giveaway = gs.giveaways.find((item) => item.id === a);
      const duration = parseDuration(get('duration'));
      if (!giveaway || duration < 60_000 || duration > 30 * 24 * 60 * 60 * 1000) return interaction.reply({ content: 'Use um tempo entre `1m` e `30d`.', ephemeral: true });
      giveaway.endAt = Date.now() + duration;
      const channel = await guild.channels.fetch(giveaway.channelId).catch(() => null);
      const message = channel?.isTextBased() ? await channel.messages.fetch(giveaway.messageId).catch(() => null) : null;
      if (message) await message.edit(giveawayMessagePayload(giveaway)).catch(() => null);
      return sendOrUpdate(interaction, giveawayDetailPanel(guild, giveaway));
    }
    case 'modal-pay-manual':
      gs.payments.manual.keyType = get('keyType');
      gs.payments.manual.pixKey = get('pixKey');
      gs.payments.manual.message = get('message');
      gs.payments.manual.configured = true;
      return sendOrUpdate(interaction, manualPaymentPanel(guild, gs));
    case 'modal-gateway': {
      const item = gs.payments[a];
      if (a === 'efi') {
        item.clientId = get('clientId');
        item.clientSecret = get('clientSecret');
        item.pixKey = get('pixKey');
        item.certificate = get('certificate');
        item.configured = false;
      } else if (a === 'interImap' || a === 'nubankImap') {
        item.email = get('email').trim();
        item.password = get('password');
        item.pixKey = get('pixKey').trim();
        item.host = get('host').trim();
        item.allowedSender = get('allowedSender').trim().toLowerCase();
        item.port = 993;
        item.secure = true;
        item.configured = false;
      } else if (a === 'evopay') {
        item.apiKey = get('apiKey').trim();
        item.configured = Boolean(item.apiKey);
      } else if (a === 'misticpay') {
        item.clientId = get('clientId').trim();
        item.clientSecret = get('clientSecret').trim();
        item.configured = Boolean(item.clientId && item.clientSecret);
      } else {
        item.accessToken = get('accessToken');
        item.publicKey = get('publicKey');
        item.configured = Boolean(item.accessToken);
      }
      return sendOrUpdate(interaction, {
        ...gatewayPaymentPanel(guild, gs, a),
        content: a === 'efi' || a === 'interImap' || a === 'nubankImap'
          ? 'Credenciais salvas. Use **Testar conexão** antes de habilitar.'
          : undefined,
      });
    }
    case 'modal-oauth-register':
      gs.cloud.linked = true;
      gs.cloud.syncedMembers = 0;
      return sendOrUpdate(interaction, oauthPanel(guild, gs));
    case 'modal-oauth-server-id':
      gs.cloud.serverId = get('serverId');
      return sendOrUpdate(interaction, oauthConfigPanel(guild, gs));
    case 'modal-oauth-webhook':
      gs.cloud.webhookUrl = get('webhookUrl');
      return sendOrUpdate(interaction, oauthConfigPanel(guild, gs));
    case 'modal-oauth-recover': {
      const serverId = get('serverId');
      const limit = Number(get('limit')) || gs.cloud.syncedMembers || 0;
      return interaction.reply({ content: `Recuperação solicitada para o servidor \`${serverId}\`, limitada a \`${limit || 'todos'}\` membros sincronizados.`, ephemeral: true });
    }
    case 'modal-store-oauth-text':
      gs.storeOauth.text = get('text');
      return sendOrUpdate(interaction, storeOauthPanel(guild, gs));
    case 'modal-position-role':
      gs.positions[Number(a) - 1].roleId = get('roleId');
      return sendOrUpdate(interaction, positionPanel(guild, gs, Number(a)));
    case 'modal-balance-action': {
      const userId = get('userId');
      const fakeUser = { id: userId, username: userId, tag: userId };
      const account = moveBalance(gs, fakeUser, parsePrice(get('amount')), a, get('reason') || 'Movimentação manual');
      return interaction.reply({ content: `Saldo de <@${userId}> atualizado para \`${money(account.balance)}\`.`, ephemeral: true });
    }
    case 'modal-balance-get': {
      const userId = get('userId');
      const account = gs.balance.users[userId];
      return interaction.reply({ content: account ? `<@${userId}> possui \`${money(account.balance)}\`.` : 'Usuário sem saldo registrado.', ephemeral: true });
    }
    case 'modal-balance-recharge':
      gs.stockRequests.push({ type: 'balance', userId: interaction.user.id, amount: parsePrice(get('amount')), note: get('note'), at: Date.now() });
      return interaction.reply({ content: `Solicitação de recarga de \`${money(parsePrice(get('amount')))}\` registrada.`, ephemeral: true });
    case 'modal-mass-coupon-create': {
      if (!gs.products.length) {
        return interaction.reply({ content: `${"<:yuki_error:1529378857575256175>"} Não existem produtos para receber o cupom. Crie um produto primeiro.`, ephemeral: true });
      }
      const code = get('code').toUpperCase();
      const discount = Number(get('discount'));
      if (!code) return interaction.reply({ content: `${"<:yuki_error:1529378857575256175>"} Informe o código do cupom.`, ephemeral: true });
      if (!Number.isFinite(discount) || discount <= 0 || discount > 100) {
        return interaction.reply({ content: `${"<:yuki_error:1529378857575256175>"} Informe um desconto entre 1 e 100.`, ephemeral: true });
      }
      let criados = 0;
      let ignorados = 0;
      for (const item of gs.products) {
        item.coupons ??= [];
        if (item.coupons.some((coupon) => coupon.code === code)) {
          ignorados += 1;
          continue;
        }
        item.coupons.push({ id: crypto.randomUUID(), code, discount, validity: get('validity'), quantity: null, maxUses: null, uses: 0, conditions: ['Cupom criado em massa'] });
        criados += 1;
      }
      return interaction.reply({
        content: `${"<:yuki_check:1529378856132415609>"} Cupom \`${code}\` criado em **${criados} produto(s)**.${ignorados ? ` Ignorado em **${ignorados}** porque já existia.` : ''}`,
        ephemeral: true,
      });
    }
    case 'modal-mass-coupon-remove': {
      const code = get('code').toUpperCase();
      for (const item of gs.products) item.coupons = (item.coupons || []).filter((coupon) => coupon.code !== code);
      return sendOrUpdate(interaction, storeCouponsPanel(guild, gs));
    }
    case 'modal-badge-new':
      gs.badges.push({ id: crypto.randomUUID(), name: get('name'), amount: parsePrice(get('amount')), emoji: get('emoji'), roleId: get('roleId') });
      return sendOrUpdate(interaction, badgesPanel(guild, gs));
    case 'modal-temp-role-new':
      gs.tempRoles.push({ id: crypto.randomUUID(), productName: get('productName'), roleId: get('roleId'), days: Number(get('days')) || 1 });
      return sendOrUpdate(interaction, tempRolePanel(guild, gs));
    case 'modal-temp-role-config':
      gs.tempRoleSettings.removeExpired = /^s/i.test(get('removeExpired'));
      gs.tempRoleSettings.notifyDm = /^s/i.test(get('notifyDm'));
      return sendOrUpdate(interaction, tempRolePanel(guild, gs));
    case 'modal-role-config':
      gs.roles[a] = get('roleId');
      return sendOrUpdate(interaction, rolesConfigPanel(guild, gs));
    case 'modal-ticket-hours':
      gs.ticket.hoursMode = get('mode');
      gs.ticket.openAt = get('openAt');
      gs.ticket.closeAt = get('closeAt');
      return sendOrUpdate(interaction, ticketHoursPanel(guild, gs));
    case 'modal-ticket-day': {
      const day = gs.ticket.hoursByDay[Number(a)];
      day.active = /^s/i.test(get('active'));
      day.openAt = get('openAt');
      day.closeAt = get('closeAt');
      return sendOrUpdate(interaction, ticketHoursPanel(guild, gs));
    }
    case 'modal-ticket-note':
      return interaction.reply({ content: `Observação registrada no ticket: ${get('note')}`, ephemeral: true });
    case 'modal-ticket-rename': {
      const ticket = gs.tickets.find((item) => item.id === a);
      if (!ticket || !isCartAdmin(interaction, gs)) return interaction.reply({ content: 'Você não pode renomear este ticket.', ephemeral: true });
      const name = get('name').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 90);
      await interaction.channel?.setName?.(name).catch(() => null);
      return interaction.reply({ content: `✅ | Ticket renomeado para \`${name}\`.`, ephemeral: true });
    }
    case 'modal-ticket-add-member': {
      const ticket = a === 'current'
        ? gs.tickets.find((item) => item.channelId === interaction.channelId && item.status === 'open')
        : gs.tickets.find((item) => item.id === a);
      if (!ticket) return interaction.reply({ content: 'Ticket não encontrado.', ephemeral: true });
      const userId = get('userId');
      const channel = interaction.channel;
      if (channel?.members?.add) await channel.members.add(userId).catch(() => null);
      else if (channel?.permissionOverwrites?.edit) await channel.permissionOverwrites.edit(userId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => null);
      return interaction.reply({ content: `✅ | <@${userId}> foi adicionado ao ticket.`, ephemeral: true });
    }
    case 'modal-automation-config': {
      const config = gs.automations[a];
      if ('content' in config) config.content = get('value1');
      if ('interval' in config) config.interval = get('value2') || config.interval;
      if ('everyMinutes' in config) config.everyMinutes = Number(get('value1')) || config.everyMinutes;
      if ('lockAt' in config) config.lockAt = get('value1') || config.lockAt;
      if ('unlockAt' in config) config.unlockAt = get('value2') || config.unlockAt;
      return sendOrUpdate(interaction, automationFeaturePanel(guild, gs, a));
    }
    case 'modal-custom-colors':
      gs.customization.colors.default = get('default');
      gs.customization.colors.success = get('success');
      gs.customization.colors.error = get('error');
      return sendOrUpdate(interaction, customDetailPanel(guild, gs, 'colors'));
    case 'modal-custom-color':
      if (Object.hasOwn(gs.customization.colors, a)) gs.customization.colors[a] = get('color');
      return sendOrUpdate(interaction, customDetailPanel(guild, gs, 'colors'));
    case 'modal-custom-bot':
      gs.customization.bot.nickname = get('nickname');
      gs.customization.bot.avatar = get('avatar');
      gs.customization.bot.banner = get('banner');
      gs.customization.bot.status = get('status') || 'Online';
      return sendOrUpdate(interaction, customDetailPanel(guild, gs, 'bot'));
    case 'modal-custom-bot-field': {
      const value = get('value');
      if (a === 'nickname') {
        try {
          await guild.members.me?.setNickname(value || null);
        } catch {
          return interaction.reply({ content: 'Não consegui alterar o nickname. Verifique se o bot possui a permissão **Gerenciar Apelidos** e se o cargo dele está acima dos demais cargos.', ephemeral: true });
        }
      }
      if (a === 'avatar') {
        if (value && !/^https?:\/\/\S+$/i.test(value)) {
          return interaction.reply({ content: 'Envie uma URL pública válida (http ou https) para o avatar.', ephemeral: true });
        }
        try {
          await interaction.client.user.setAvatar(value || null);
        } catch {
          return interaction.reply({ content: 'Não consegui alterar o avatar. Use uma imagem pública em PNG, JPG, WEBP ou GIF e tente novamente.', ephemeral: true });
        }
      }
      if (a === 'status1' || a === 'status2') {
        const activity = a === 'status2' ? (gs.customization.bot.status1 || value) : value;
        await interaction.client.user.setPresence({ activities: activity ? [{ name: activity }] : [], status: 'online' });
      }
      gs.customization.bot[a] = value;
      return sendOrUpdate(interaction, customDetailPanel(guild, gs, 'bot'));
    }
    case 'modal-custom-brand':
      gs.customization.brand.qrLogo = get('qrLogo');
      gs.customization.brand.qrColor = get('qrColor');
      return sendOrUpdate(interaction, customDetailPanel(guild, gs, 'brand'));
    case 'modal-custom-public-image':
      gs.customization.publicLog.image = get('image');
      return sendOrUpdate(interaction, customDetailPanel(guild, gs, 'public-log'));
    case 'modal-custom-product-color':
      gs.customization.productMessages.sideColor = get('color');
      for (const item of gs.products) await syncSaleMessage(guild, item);
      return sendOrUpdate(interaction, customDetailPanel(guild, gs, 'product-v2'));
    case 'modal-custom-feedback':
      gs.customization.feedbackDm.message = get('message');
      return sendOrUpdate(interaction, customDetailPanel(guild, gs, 'feedback-dm'));
    case 'modal-custom-feedback-button':
      gs.customization.feedbackDm.buttonText = get('buttonText');
      return sendOrUpdate(interaction, customDetailPanel(guild, gs, 'feedback-dm'));
    case 'modal-zenwallet-consult':
      return interaction.reply({ content: `Pagamento \`${get('paymentId')}\`: \`Pendente/Não encontrado no ambiente local\`.`, ephemeral: true });
    case 'modal-protect-raid':
      gs.protect.raidLimit = Math.max(2, Math.min(50, Number(get('limit')) || gs.protect.raidLimit));
      gs.protect.raidWindowSeconds = Math.max(3, Math.min(120, Number(get('seconds')) || gs.protect.raidWindowSeconds));
      gs.protect.auditLimit = Math.max(2, Math.min(30, Number(get('auditLimit')) || gs.protect.auditLimit));
      gs.protect.auditWindowSeconds = Math.max(5, Math.min(120, Number(get('auditSeconds')) || gs.protect.auditWindowSeconds));
      {
        const escolha = get('punishment').toLowerCase();
        gs.protect.raidPunishment = /kick|expuls/.test(escolha)
          ? 'Kick'
          : /timeout|silenciar/.test(escolha)
            ? 'Timeout'
            : 'Registrar em log';
      }
      return sendOrUpdate(interaction, protectDetailPanel(guild, gs, 'antiraid'));
    case 'modal-protect-antispam':
      gs.protect.antiSpamLimit = Math.max(2, Math.min(30, Number(get('limit')) || gs.protect.antiSpamLimit));
      gs.protect.antiSpamWindowSeconds = Math.max(3, Math.min(60, Number(get('seconds')) || gs.protect.antiSpamWindowSeconds));
      gs.protect.antiSpamTimeoutMinutes = Math.max(0, Math.min(1440, Number(get('timeout')) || 0));
      return sendOrUpdate(interaction, protectMessagePanel(guild, gs, 'antispam'));
    case 'modal-protect-mentions':
      gs.protect.mentionLimit = Math.max(2, Math.min(50, Number(get('limit')) || gs.protect.mentionLimit));
      gs.protect.mentionTimeoutMinutes = Math.max(0, Math.min(1440, Number(get('timeout')) || 0));
      return sendOrUpdate(interaction, protectMessagePanel(guild, gs, 'antimentions'));
    case 'modal-protect-selfbot-limit':
      gs.protect.selfBot.limit = Math.max(3, Math.min(20, Number(get('limit')) || 4));
      return sendOrUpdate(interaction, protectSelfBotPanel(guild, gs));
    case 'modal-antifake':
      gs.antiFake.minimumAccountDays = Math.max(0, Math.min(365, Number(get('days')) || 7));
      gs.antiFake.action = get('action') || 'Registrar em log';
      return sendOrUpdate(interaction, antiFakePanel(guild, gs));
    case 'modal-stock-request': {
      const productName = get('product');
      const quantity = get('quantity') || 'Não informada';
      const request = { type: 'stock', userId: interaction.user.id, product: productName, quantity, at: Date.now() };
      gs.stockRequests.push(request);
      const logMessage = embed(
        'Nova solicitação de estoque',
        [
          `**Solicitante:** <@${interaction.user.id}>`,
          `**Produto:** ${productName}`,
          `**Quantidade:** ${quantity}`,
          `**Data:** <t:${Math.floor(request.at / 1000)}:F>`,
        ].join('\n'),
        guild,
        'Solicitações de estoque',
      );
      const logSent = gs.channels?.stockRequests
        ? await sendConfiguredLog(guild, gs.channels.stockRequests, { embeds: [logMessage] })
        : null;
      return interaction.reply({
        content: logSent
          ? `Solicitação de estoque registrada para \`${productName}\` e enviada à equipe.`
          : `Solicitação de estoque registrada para \`${productName}\`. O canal de solicitações ainda não está configurado.`,
        ephemeral: true,
      });
    }
    default:
      return interaction.reply({ content: 'Não foi possível identificar este formulário. Abra o painel novamente.', ephemeral: true });
  }
}
}
