
// Executor dos slash commands do Zend clonando.
// Aqui ficam as respostas dos comandos /panel, /sales, /entregar e similares.

import { gerarPixCopiaCola } from '../pagamentos/pix.js';
import { saveState } from '../database/estado.js';
import { GEMINI_MODEL, atualizarVariaveisEnv } from '../configuracoes/ambiente.js';
import {
  gerarProdutoComIA,
  responderTicketComIA,
  melhorarTextoComIA,
  testarConexaoGemini,
} from '../infraestrutura/gemini-ai.js';

export function criarExecutorSlash(contexto) {
  const {
    ActionRowBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    StringSelectMenuBuilder,
    button,
    deliverCart,
    embed,
    emojiSyncSummary,
    fieldPanel,
    getCart,
    id,
    isCartAdmin,
    mainPanel,
    money,
    parseHex,
    productPanel,
    salePayload,
    statementPanel,
    stockCount,
    stockPanel,
    syncLocalEmojis,
    zenWalletPanel,
  } = contexto;

function commandListEmbed(guild) {
  return embed(
    'Ajuda — zenSallers',
    [
      '**Painel e loja**',
      '`/panel`, `/manage_product`, `/manage_item`, `/manage_stock`, `/create_mass_coupon`, `/remove_mass_coupon`, `/delivery`, `/entregar`',
      '',
      '**Saldo e vendas**',
      '`/addsaldo`, `/removersaldo`, `/saldopanel`, `/perfil`, `/sales`, `/vercompras`, `/consultarpagamento`, `/zenwallet`',
      '',
      '**Tickets e suporte**',
      '`/managetickets`, `/ticketstaff`, `/add_ticket`, `/remove_ticket`, `/rename_ticket`, `/assumir_ticket`, `/transcript_ticket`, `/archive_ticket`, `/close_ticket`',
      '',
      '**Comunidade e cargos**',
      '`/setperm`, `/roleall`, `/cargoall`, `/removercargoall`, `/convites`, `/remove-feedback`, `/lock`, `/unlock`, `/nuke`, `/enviarpv`, `/anunciar`',
      '',
      '**Condecorações e clientes**',
      '`/condecoracoes`, `/conceder-condecoracao`, `/atualizar-condecoracoes`, `/sincronizar_posicoes`, `/vincular_clientes`, `/vincular_assinatura`',
      '',
      '**Outros**',
      '`/solicitarestoque`, `/cuponwin`, `/addemoji`, `/syncemojis`, `/tutorial`, `/ajuda`',
    ].join('\n'),
    guild,
    'Ajuda',
  );
}

const HELP_PAGES = {
  home: {
    title: 'Central de Ajuda',
    description: [
      'Bem-vindo à central de ajuda do bot!',
      '',
      'Use o menu abaixo para explorar os comandos disponíveis por categoria.',
      '',
      '**Categorias disponíveis:**',
      '',
      'Administração - Gestão de produtos, vendas e servidor',
      'Financeiro - PIX, cupons e pagamentos',
      'Tickets - Suporte e atendimento',
      'Usuários - Comandos para todos os membros',
      'Menus de Contexto - Ações rápidas via botão direito',
      'Navegue pelas categorias para ver todos os comandos',
    ].join('\n'),
  },
  products: {
    title: 'Gestão de Produtos e Vendas',
    description: [
      'Comandos para gerenciar produtos, estoque e vendas',
      '/panel',
      'Abre o painel de controle principal com todas as configurações do sistema.',
      '/manage_product',
      'Gerencia um produto específico - edita preço, descrição, imagens e configurações.',
      '/manage_stock',
      'Gerencia o estoque de um produto - adiciona, remove ou visualiza itens disponíveis.',
      '/manage_item',
      'Gerencia campos específicos de um produto (variações, tamanhos, etc).',
      '/postproduto',
      'Posta a mensagem de um produto em um canal específico com botão de compra.',
      '/produtossemestoque',
      'Lista todos os produtos que estão sem estoque atualmente.',
      '/solicitarestoque',
      'Envia um painel para usuários solicitarem reposição de estoque.',
      '/delivery',
      'Entrega um produto manualmente para um usuário específico.',
      '/entregar',
      'Aprova um carrinho de compra manualmente.',
      '/sales',
      'Exibe relatório detalhado de todas as vendas realizadas.',
      '/rank',
      'Mostra o ranking de clientes por valor gasto no servidor.',
      'Dica: Use /panel para acessar todas as configurações',
    ].join('\n'),
  },
  finance: {
    title: 'Financeiro e Pagamentos',
    description: [
      'Comandos para gerenciar pagamentos, PIX e cupons',
      '/gerarpix',
      'Gera um QR Code PIX para pagamento avulso com valor personalizado.',
      '/zenwallet',
      'Abre o painel do zenWallet - carteira digital integrada para receber e sacar pagamentos.',
      '/cuponwin',
      'Envia um cupom de desconto exclusivo na DM de um usuário com link direto para o produto.',
      '/create_mass_coupon',
      'Cria cupons de desconto em massa para todos os produtos com configurações personalizadas.',
      '/remove_mass_coupon',
      'Remove cupons criados em massa baseado no nome do cupom.',
      'O zenWallet permite acumular saldo das vendas e sacar via PIX',
    ].join('\n'),
  },
  tickets: {
    title: 'Tickets e Suporte',
    description: [
      'Comandos para gerenciar tickets de atendimento',
      '/add_ticket',
      'Adiciona um usuário ao ticket atual para participar da conversa.',
      '/close_ticket',
      'Fecha o ticket de suporte atual, finalizando o atendimento.',
      '/archive_ticket',
      'Arquiva um ticket encerrado, preservando o histórico.',
      '/closealltickets',
      'Fecha todos os tickets abertos de uma vez (use com cuidado!).',
      'Os tickets permitem atendimento privado aos clientes',
    ].join('\n'),
  },
  admin: {
    title: 'Administração do Servidor',
    description: [
      'Comandos para gerenciar o servidor e membros',
      '/anunciar',
      'Cria e envia anúncios personalizados com embed customizável para qualquer canal.',
      '/enviarpv',
      'Envia uma mensagem privada personalizada para um membro do servidor.',
      '/clear',
      'Limpa mensagens do canal atual (pode especificar quantidade).',
      '/lock',
      'Tranca o canal atual, impedindo envio de mensagens por membros.',
      '/nuke',
      'Recria o canal completamente, removendo todas as mensagens antigas.',
      '/cargoall',
      'Adiciona um cargo a todos os membros do servidor.',
      '/removercargoall',
      'Remove um cargo de todos os membros do servidor.',
      '/sincronizar_permissoes',
      'Sincroniza as permissões de todos os canais com suas categorias.',
      '/sincronizar_posicoes',
      'Sincroniza os cargos de posição (VIP, etc) baseado no valor gasto dos clientes.',
      '/syncemojis',
      'Sincroniza os emojis locais clonados com este servidor.',
      '/vincular_clientes',
      'Sincroniza o cargo de cliente para todos que já compraram.',
      'Estes comandos requerem permissão de administrador',
    ].join('\n'),
  },
  invites: {
    title: 'Sistema de Convites',
    description: [
      'Comandos relacionados ao sistema de convites',
      '/invites_reset',
      'Reseta os convites de um usuário específico ou de todos os membros.',
      '/convites',
      'Mostra suas estatísticas de convites ou de outro usuário.',
      '/rank_convites',
      'Exibe o ranking dos membros que mais convidaram pessoas.',
      'O sistema de convites precisa estar ativado no painel',
    ].join('\n'),
  },
  badges: {
    title: 'Sistema de Condecorações',
    description: [
      'Comandos para gerenciar condecorações e conquistas',
      '/condecoracoes',
      'Exibe suas condecorações conquistadas através de compras no servidor.',
      '/conceder-condecoracao',
      'Concede uma condecoração manualmente a um usuário específico.',
      '/atualizar-condecoracoes',
      'Recalcula e atualiza as condecorações de um usuário com base nas compras.',
      'Condecorações são conquistadas automaticamente ao atingir metas de compra',
    ].join('\n'),
  },
  users: {
    title: 'Comandos para Usuários',
    description: [
      'Comandos disponíveis para todos os membros do servidor',
      '/perfil',
      'Exibe seu perfil completo com histórico de compras, valor total gasto e cargos.',
      '/convites',
      'Mostra suas estatísticas de convites (válidos, bônus, fakes, etc).',
      '/rank_convites',
      'Veja o ranking dos maiores convidadores do servidor.',
      '/condecoracoes',
      'Visualize suas condecorações e conquistas obtidas.',
      '/ajuda',
      'Mostra esta central de ajuda com todos os comandos disponíveis.',
      'Estes comandos estão disponíveis para todos',
    ].join('\n'),
  },
};

function helpPanel(guild, page = 'home') {
  const current = HELP_PAGES[page] || HELP_PAGES.home;
  const select = new StringSelectMenuBuilder()
    .setCustomId(id('help-menu'))
    .setPlaceholder('📁 Selecione uma categoria')
    .addOptions(
      { label: 'Página Principal', description: 'Voltar para a tela inicial', value: 'home', emoji: '🏠' },
      { label: 'Produtos e Vendas', description: 'Gestão de produtos, estoque e vendas', value: 'products', emoji: '🛒' },
      { label: 'Financeiro', description: 'PIX, cupons e pagamentos', value: 'finance', emoji: '💰' },
      { label: 'Tickets e Suporte', description: 'Gestão de tickets de atendimento', value: 'tickets', emoji: '🎫' },
      { label: 'Administração', description: 'Gerenciamento do servidor', value: 'admin', emoji: '⚙️' },
      { label: 'Sistema de Convites', description: 'Invite tracker e rankings', value: 'invites', emoji: '📨' },
      { label: 'Condecorações', description: 'Conquistas e medalhas', value: 'badges', emoji: '🏆' },
      { label: 'Comandos de Usuário', description: 'Comandos para todos os membros', value: 'users', emoji: '👤' },
    );
  return {
    embeds: [embed(current.title, current.description, guild, 'Ajuda')],
    components: [new ActionRowBuilder().addComponents(select)],
  };
}

function findProduct(gs, query) {
  if (!query) return gs.products.at(-1);
  return gs.products.find((product) => product.id === query || product.name.toLowerCase().includes(String(query).toLowerCase())) || gs.products.at(-1);
}

function findField(product, query) {
  if (!product) return null;
  if (!query) return product.fields?.[0];
  return product.fields?.find((field) => field.id === query || field.name.toLowerCase().includes(String(query).toLowerCase())) || product.fields?.[0];
}

function balanceUser(gs, user) {
  gs.balance.users[user.id] ??= {
    id: user.id,
    tag: user.tag || user.username,
    balance: 0,
    spent: 0,
    badges: [],
    history: [],
  };
  return gs.balance.users[user.id];
}

function moveBalance(gs, user, amount, mode, reason = 'Movimentação manual') {
  const account = balanceUser(gs, user);
  const before = Number(account.balance || 0);
  if (mode === 'set') account.balance = amount;
  if (mode === 'add') account.balance = before + amount;
  if (mode === 'remove') account.balance = Math.max(0, before - amount);
  const event = { at: Date.now(), userId: user.id, mode, amount, before, after: account.balance, reason };
  account.history.push(event);
  gs.balance.history.push(event);
  return account;
}

function profileEmbed(guild, gs, user) {
  const account = balanceUser(gs, user);
  const purchases = gs.purchases.filter((purchase) => purchase.userId === user.id);
  return embed(
    `Perfil de ${user.username}`,
    [
      `**Saldo:** \`${money(account.balance)}\``,
      `**Total gasto:** \`${money(account.spent)}\``,
      `**Compras:** \`${purchases.length}\``,
      `**Condecorações:** ${account.badges.length ? account.badges.map((badge) => `\`${badge}\``).join(', ') : '`Nenhuma`'}`,
      `**Convites:** \`${gs.invitations[user.id]?.count || 0}\``,
    ].join('\n'),
    guild,
    'Perfil',
  );
}

function purchasesEmbed(guild, gs, user) {
  const purchases = gs.purchases.filter((purchase) => purchase.userId === user.id);
  const body = purchases.length
    ? purchases.slice(-10).map((purchase, index) => `\`${index + 1}.\` ${purchase.product} - ${money(purchase.amount)} - <t:${Math.floor(purchase.at / 1000)}:R>`).join('\n')
    : [
      'Você ainda não possui nenhuma compra registrada.',
      '',
      '',
      'Quando realizar uma compra, ela aparecerá aqui com todos os detalhes!',
    ].join('\n');
  return embed(`Compras de ${user.username}`, body, guild, 'Compras');
}

function spendingRankEmbed(guild, gs, limit = 10) {
  const users = Object.values(gs.balance.users)
    .sort((a, b) => Number(b.spent || 0) - Number(a.spent || 0))
    .slice(0, limit);
  const body = users.length
    ? users.map((user, index) => `\`${index + 1}.\` <@${user.id}> — ${money(user.spent || 0)}`).join('\n')
    : '`Nenhum gasto registrado ainda.`';
  return embed('Ranking de Clientes', body, guild, 'Vendas');
}

function inviteRankEmbed(guild, gs, limit = 10) {
  const users = Object.entries(gs.invitations)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
    .slice(0, limit);
  const body = users.length
    ? users.map((user, index) => `\`${index + 1}.\` <@${user.id}> — \`${user.count || 0}\` convites`).join('\n')
    : '`Nenhum convite registrado ainda.`';
  return embed('Ranking de Convites', body, guild, 'Convites');
}

function outOfStockEmbed(guild, gs) {
  const rows = [];
  for (const product of gs.products) {
    const emptyFields = product.fields.filter((field) => stockCount(field) <= 0);
    if (emptyFields.length) rows.push(`**${product.name}**\n${emptyFields.map((field) => `• ${field.name}`).join('\n')}`);
  }
  return embed(
    'Produtos sem estoque',
    rows.length ? rows.join('\n\n') : '`Nenhum produto sem estoque no momento.`',
    guild,
    'Estoque',
  );
}

function balancePublicPayload(guild, gs) {
  return {
    embeds: [
      embed(
        'zenSallers\nPainel de Saldo',
        [
          'Use este painel para solicitar recarga de saldo interno.',
          `**Sistema:** \`${gs.balance.enabled ? '🟢 Habilitado' : '🔴 Desabilitado'}\``,
          `**Pagamento manual:** \`${gs.payments.manual.enabled ? 'Habilitado' : 'Desabilitado'}\``,
        ].join('\n'),
        guild,
        'Saldo',
      ),
    ],
    components: [new ActionRowBuilder().addComponents(button(id('balance-recharge'), 'Recarregar saldo', ButtonStyle.Success, { id: '1529378858615439523', name: 'yuki_cash' }))],
  };
}

function stockRequestPayload(guild) {
  return {
    embeds: [
      embed(
        'Solicitar Estoque',
        'Use o botão abaixo para solicitar restock de um produto. A equipe receberá a solicitação no canal configurado.',
        guild,
        'Solicitações de estoque',
      ),
    ],
    components: [new ActionRowBuilder().addComponents(button(id('stock-request-open'), 'Solicitar produto', ButtonStyle.Secondary, { id: '1529341183292211401', name: 'inventory_2_30dp_E3E3E3_FILL0_wg' }))],
  };
}

function ticketManagerPanel(guild, gs) {
  return {
    embeds: [
      embed(
        'zenSallers\nGerenciamento de Tickets',
        [
          `**Abertos:** \`${gs.tickets.filter((ticket) => ticket.status === 'open').length}\``,
          `**Arquivados:** \`${gs.tickets.filter((ticket) => ticket.status === 'archived').length}\``,
          `**Funções:** \`${gs.ticket.functions.length}\``,
        ].join('\n'),
        guild,
        'Tickets',
      ),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        button(id('ticket'), 'Configurar sistema', ButtonStyle.Secondary, { id: '1529378865083056201', name: 'yuki_settings' }),
        button(id('ticket-stats'), 'Estatísticas', ButtonStyle.Secondary, { id: '1518360382245441638', name: 'activity' }),
      ),
    ],
  };
}

function ticketStaffPanel(guild) {
  return {
    embeds: [
      embed(
        'Painel Staff do Ticket',
        'Ações rápidas para o ticket atual: adicionar usuário, arquivar, chamar cliente, renomear e registrar observações.',
        guild,
        'Ticket Staff',
      ),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        button(id('ticket-staff-add'), 'Adicionar usuário', ButtonStyle.Secondary, { id: '1529378868904067173', name: 'yuki_add' }),
        button(id('ticket-staff-archive'), 'Arquivar ticket', ButtonStyle.Danger, { id: '1529344368924688515', name: 'lixeiraxmark' }),
        button(id('ticket-staff-note'), 'Observação', ButtonStyle.Secondary, { id: '1518360432795062483', name: 'title' }),
      ),
    ],
  };
}

function ticketAbertoDoCanal(gs, channelId) {
  return gs.tickets.find((ticket) => ticket.channelId === channelId && ticket.status === 'open');
}

function nomeCanalTicket(value) {
  return String(value || 'ticket').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9-_ ]/g, '').trim().replace(/\s+/g, '-').slice(0, 90) || 'ticket';
}

async function exigirTicketDaEquipe(interaction, gs) {
  if (!isCartAdmin(interaction, gs)) {
    await interaction.reply({ content: '❌ | Apenas membros da equipe podem usar este comando.', ephemeral: true });
    return null;
  }
  const ticket = ticketAbertoDoCanal(gs, interaction.channelId);
  if (!ticket) {
    await interaction.reply({ content: '❌ | Este comando precisa ser usado dentro de um ticket aberto.', ephemeral: true });
    return null;
  }
  return ticket;
}

async function arquivarTicketSlash(interaction, ticket, motivo) {
  const { montarTranscript } = await import('../logs/embeds-cliente.js');
  const transcript = await montarTranscript(interaction.channel, ticket);
  ticket.status = 'archived';
  ticket.closedAt = Date.now();
  ticket.closedBy = interaction.user.id;
  ticket.closeReason = motivo || 'Não informado';
  ticket.transcriptContent = transcript;
  const fileName = `transcript-${String(ticket.id || 'ticket').slice(0, 12)}.txt`;
  const owner = await interaction.guild.members.fetch(ticket.userId).catch(() => null);
  await owner?.send({
    content: `Seu ticket **${ticket.functionName || 'Suporte'}** foi encerrado por ${interaction.user}.`,
    files: [{ attachment: Buffer.from(transcript, 'utf8'), name: fileName }],
  }).catch(() => null);
  return fileName;
}

async function handleSlashCommand(interaction, gs) {
  const { commandName: command } = interaction;
  const guild = interaction.guild;
  const options = interaction.options;

  const exigirPermissaoMod = () => {
    if (isCartAdmin(interaction, gs)) return true;
    interaction.reply({ content: '❌ | Você não possui permissão para usar este comando.', ephemeral: true });
    return false;
  };

  if (command === 'panel') {
    if (!isCartAdmin(interaction, gs)) return interaction.reply({ content: '❌ | Você não possui permissão para abrir o painel administrativo.', ephemeral: true });
    return interaction.reply({ ...mainPanel(guild), ephemeral: true });
  }
  if (command === 'ajuda') return interaction.reply({ ...helpPanel(guild), ephemeral: true });
  if (command === 'zenwallet') return interaction.reply({ ...zenWalletPanel(guild, gs), ephemeral: true });
  if (command === 'managetickets') return interaction.reply({ ...ticketManagerPanel(guild, gs), ephemeral: true });
  if (command === 'ticketstaff') return interaction.reply({ ...ticketStaffPanel(guild), ephemeral: true });
  if (command === 'tutorial') {
    if (!isCartAdmin(interaction, gs)) return interaction.reply({ content: '❌ | Você não possui permissão para abrir o painel administrativo.', ephemeral: true });
    return interaction.reply({ content: 'Tutorial reiniciado. Comece pelas configurações, depois crie produtos e publique mensagens.', ...mainPanel(guild), ephemeral: true });
  }

  if (command === 'ia_config') {
    if (!exigirPermissaoMod()) return;
    await interaction.deferReply({ ephemeral: true });
    const chave = options.getString('chave');
    const modelo = options.getString('modelo');

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
      return interaction.editReply({ content: `❌ Erro ao configurar IA: ${err.message}` });
    }
  }

  if (command === 'ia_gerar_produto') {
    if (!exigirPermissaoMod()) return;
    await interaction.deferReply({ ephemeral: true });
    const promptText = options.getString('prompt', true);

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

  if (command === 'ia_ticket') {
    await interaction.deferReply({ ephemeral: false });
    const duvida = options.getString('duvida');

    try {
      let msgs = [];
      if (interaction.channel?.messages) {
        const fetched = await interaction.channel.messages.fetch({ limit: 10 }).catch(() => null);
        if (fetched) {
          msgs = fetched
            .reverse()
            .map((m) => `${m.author.username}: ${m.content}`)
            .filter((line) => line.length > 5);
        }
      }

      const duvidaTexto = duvida || 'Como funciona o atendimento e compras nesta loja?';
      const respostaIA = await responderTicketComIA(duvidaTexto, msgs, gs);

      return interaction.editReply({
        embeds: [
          embed(
            '🤖 Suporte Assistido por IA (Gemini)',
            respostaIA,
            guild,
            'Suporte IA',
          ),
        ],
      });
    } catch (err) {
      return interaction.editReply({ content: `❌ Erro ao consultar IA para o ticket: ${err.message}` });
    }
  }

  if (command === 'ia_melhorar_descricao') {
    if (!exigirPermissaoMod()) return;
    await interaction.deferReply({ ephemeral: true });
    const query = options.getString('produto', true);
    const prod = findProduct(gs, query);

    if (!prod) {
      return interaction.editReply({ content: `❌ Produto não encontrado com o parâmetro \`${query}\`.` });
    }

    try {
      const novaDescricao = await melhorarTextoComIA(prod.description || prod.name, 'vendas e atratividade');
      prod.description = novaDescricao;
      await saveState();

      return interaction.editReply({
        content: `✨ **Descrição do produto \`${prod.name}\` atualizada com sucesso via Gemini AI!**`,
        embeds: [
          embed(
            `Nova Descrição — ${prod.name}`,
            novaDescricao,
            guild,
            'IA',
          ),
        ],
      });
    } catch (err) {
      return interaction.editReply({ content: `❌ Erro ao melhorar descrição com IA: ${err.message}` });
    }
  }

  if (command === 'setperm') {
    const podeGerenciar = interaction.user.id === guild.ownerId
      || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
    if (!podeGerenciar) {
      return interaction.reply({ content: '⚡ Somente o dono do servidor ou um administrador pode alterar as permissões do bot.', ephemeral: true });
    }
    const user = options.getUser('usuario', true);
    const permitir = options.getBoolean('permitir', true);
    if (user.bot) {
      return interaction.reply({ content: '⚡ A permissão administrativa do bot só pode ser concedida a usuários.', ephemeral: true });
    }
    gs.botAdmins ??= [];
    if (permitir) {
      gs.botAdmins = [...new Set([...gs.botAdmins, user.id])];
      return interaction.reply({ content: `⚡ ${user} agora pode gerenciar todo o bot junto com você.`, ephemeral: true });
    }
    gs.botAdmins = gs.botAdmins.filter((userId) => userId !== user.id);
    return interaction.reply({ content: `⚡ A permissão administrativa de ${user} foi removida.`, ephemeral: true });
  }

  if (command === 'syncemojis') {
    if (!isCartAdmin(interaction, gs)) {
      return interaction.reply({ content: 'Voce precisa da permissao Gerenciar Servidor para sincronizar emojis do aplicativo.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    const result = await syncLocalEmojis(guild, gs);
    return interaction.editReply({ content: emojiSyncSummary(result) });
  }

  if (command === 'addemoji') {
    if (!guild) {
      return interaction.reply({ content: 'Este comando só pode ser usado dentro de um servidor.', ephemeral: true });
    }
    if (!isCartAdmin(interaction, gs)) {
      return interaction.reply({ content: 'Você não possui permissão administrativa no bot.', ephemeral: true });
    }
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
      return interaction.reply({ content: 'Eu preciso da permissão **Gerenciar Expressões** para adicionar emojis neste servidor.', ephemeral: true });
    }

    const entrada = options.getString('emoji', true).trim();
    const emojiEncontrado = entrada.match(/^<(a?):([A-Za-z0-9_]{2,32}):(\d{17,20})>$/);
    if (!emojiEncontrado) {
      return interaction.reply({
        content: 'Emoji inválido. Envie um emoji personalizado de outro servidor, por exemplo: `<:nome:123456789012345678>`.',
        ephemeral: true,
      });
    }

    const animado = emojiEncontrado[1] === 'a';
    const nomeOriginal = emojiEncontrado[2];
    const emojiId = emojiEncontrado[3];
    const nomeInformado = options.getString('nome');
    const nome = String(nomeInformado || nomeOriginal)
      .replace(/[^A-Za-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 32);

    if (nome.length < 2) {
      return interaction.reply({ content: 'O nome do emoji precisa ter pelo menos 2 caracteres válidos.', ephemeral: true });
    }
    if (guild.emojis.cache.some((emoji) => emoji.name?.toLowerCase() === nome.toLowerCase())) {
      return interaction.reply({ content: `Já existe um emoji chamado \`:${nome}:\` neste servidor.`, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    const extensao = animado ? 'gif' : 'png';
    const url = `https://cdn.discordapp.com/emojis/${emojiId}.${extensao}?size=128&quality=lossless`;

    try {
      const criado = await guild.emojis.create({
        attachment: url,
        name: nome,
        reason: `Emoji importado por ${interaction.user.tag}`,
      });
      return interaction.editReply({ content: `${criado} Emoji \`:${criado.name}:\` adicionado com sucesso!` });
    } catch (error) {
      const codigo = error?.code ?? error?.rawError?.code;
      if (codigo === 30008) {
        return interaction.editReply({ content: 'O servidor atingiu o limite de emojis personalizados.' });
      }
      if (codigo === 50035) {
        return interaction.editReply({ content: 'O arquivo desse emoji é inválido ou grande demais para ser importado.' });
      }
      if (codigo === 50013) {
        return interaction.editReply({ content: 'Não tenho permissão para gerenciar os emojis deste servidor.' });
      }
      console.error('Falha ao importar emoji:', error);
      return interaction.editReply({ content: 'Não foi possível baixar ou adicionar esse emoji. Verifique se ele ainda existe.' });
    }
  }

  if (command === 'addsaldo' || command === 'removersaldo') {
    const user = options.getUser('user', true);
    const value = Number(options.getNumber('valor', true));
    const account = moveBalance(gs, user, value, command === 'addsaldo' ? 'add' : 'remove', options.getString('motivo') || 'Slash command');
    return interaction.reply({ content: `Saldo de ${user} atualizado para \`${money(account.balance)}\`.`, ephemeral: true });
  }

  if (command === 'perfil') {
    const user = options.getUser('user') || interaction.user;
    return interaction.reply({ embeds: [profileEmbed(guild, gs, user)], ephemeral: true });
  }

  if (command === 'vercompras') {
    const user = options.getUser('user') || interaction.user;
    return interaction.reply({ embeds: [purchasesEmbed(guild, gs, user)], ephemeral: true });
  }

  if (command === 'sales') return interaction.reply({ ...statementPanel(guild, gs, interaction.user), ephemeral: true });

  if (command === 'saldopanel') {
    const channel = options.getChannel('canal') || interaction.channel;
    if (!channel?.isTextBased()) return interaction.reply({ content: 'Canal inválido para publicar o painel de saldo.', ephemeral: true });
    await channel.send(balancePublicPayload(guild, gs));
    return interaction.reply({ content: `Painel de saldo publicado em ${channel}.`, ephemeral: true });
  }

  if (command === 'anunciar') {
    const channel = options.getChannel('canal', true);
    if (!channel?.isTextBased()) return interaction.reply({ content: 'Canal inválido.', ephemeral: true });
    const announcement = embed(options.getString('titulo', true), options.getString('mensagem', true), guild, 'Anúncio');
    const color = options.getString('cor');
    const image = options.getString('imagem');
    if (color) announcement.setColor(parseHex(color));
    if (image) announcement.setImage(image);
    const msg = await channel.send({ embeds: [announcement] });
    return interaction.reply({ content: `Anúncio enviado: ${msg.url}`, ephemeral: true });
  }

  if (command === 'enviarpv') {
    const user = options.getUser('user', true);
    const message = options.getString('mensagem', true);
    await user.send({ embeds: [embed(`Mensagem de ${guild.name}`, message, guild, 'Zend')] }).catch(() => null);
    return interaction.reply({ content: `Mensagem privada enviada para ${user}.`, ephemeral: true });
  }

  if (command === 'create_mass_coupon') {
    const code = options.getString('codigo', true).toUpperCase();
    const discount = options.getNumber('desconto', true);
    for (const product of gs.products) {
      product.coupons ??= [];
      product.coupons.push({ id: crypto.randomUUID(), code, discount, validity: options.getString('validade') || '', quantity: null, maxUses: null, uses: 0, conditions: ['Cupom criado em massa'] });
    }
    return interaction.reply({ content: `Cupom \`${code}\` criado em \`${gs.products.length}\` produtos.`, ephemeral: true });
  }

  if (command === 'remove_mass_coupon') {
    const code = options.getString('codigo', true).toUpperCase();
    let removed = 0;
    for (const product of gs.products) {
      const before = product.coupons?.length || 0;
      product.coupons = (product.coupons || []).filter((coupon) => coupon.code !== code);
      removed += before - product.coupons.length;
    }
    return interaction.reply({ content: `Cupom \`${code}\` removido de \`${removed}\` entradas.`, ephemeral: true });
  }

  if (command === 'manage_product') {
    const product = findProduct(gs, options.getString('produto'));
    if (!product) return interaction.reply({ content: 'Nenhum produto encontrado.', ephemeral: true });
    return interaction.reply({ ...productPanel(guild, product), ephemeral: true });
  }

  if (command === 'manage_item') {
    const product = findProduct(gs, options.getString('produto'));
    const field = findField(product, options.getString('campo'));
    if (!product || !field) return interaction.reply({ content: 'Nenhum campo encontrado para gerenciar.', ephemeral: true });
    return interaction.reply({ ...fieldPanel(guild, product, field), ephemeral: true });
  }

  if (command === 'manage_stock') {
    const product = findProduct(gs, options.getString('produto'));
    const field = findField(product, options.getString('campo'));
    if (!product || !field) return interaction.reply({ content: 'Nenhum estoque encontrado para gerenciar.', ephemeral: true });
    return interaction.reply({ ...stockPanel(guild, product, field), ephemeral: true });
  }

  if (command === 'postproduto') {
    const channel = options.getChannel('canal', true);
    const product = findProduct(gs, options.getString('produto'));
    if (!product) return interaction.reply({ content: 'Nenhum produto encontrado para postar.', ephemeral: true });
    if (!channel?.isTextBased()) return interaction.reply({ content: 'Canal inválido.', ephemeral: true });
    const { prepararMensagem } = await import('../infraestrutura/resposta-painel.js');
    const msg = await channel.send(prepararMensagem(salePayload(product, gs)));
    product.salesMessage = { channelId: channel.id, messageId: msg.id };
    return interaction.reply({
      content: `Mensagem do produto postada${gs.customization?.productMessages?.v2 ? ' (V2)' : ''}: ${msg.url}`,
      ephemeral: true,
    });
  }

  if (command === 'produtossemestoque') {
    const hasEmpty = gs.products.some((product) => product.fields.some((field) => stockCount(field) <= 0));
    if (!hasEmpty) return interaction.reply({ content: 'Todos os produtos possuem estoque.', ephemeral: true });
    return interaction.reply({ embeds: [outOfStockEmbed(guild, gs)], ephemeral: true });
  }

  if (command === 'rank') {
    return interaction.reply({ embeds: [spendingRankEmbed(guild, gs, options.getInteger('limite') || 10)], ephemeral: true });
  }

  if (command === 'delivery') {
    const user = options.getUser('user', true);
    const product = options.getString('produto', true);
    const content = options.getString('conteudo', true);
    gs.purchases.push({ userId: user.id, product, amount: 0, at: Date.now(), manual: true });
    balanceUser(gs, user).spent += 0;
    return interaction.reply({ content: `Entrega manual registrada para ${user}.\n\`\`\`\n${content}\n\`\`\``, ephemeral: true });
  }

  if (command === 'entregar') {
    if (!isCartAdmin(interaction, gs)) {
      return interaction.reply({ content: 'Você não possui permissão para aprovar carrinhos.', ephemeral: true });
    }
    const query = options.getString('id');
    const cart = getCart(gs, query || interaction.channelId)
      || [...gs.carts].reverse().find((item) => ['AWAITING_APPROVAL', 'AWAITING_MANUAL_PAYMENT'].includes(item.status));
    if (!cart) return interaction.reply({ content: 'Nenhum carrinho pendente foi encontrado.', ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    const result = await deliverCart(interaction, gs, cart, interaction.user.id);
    return interaction.editReply({ content: result.message });
  }
  if (command === 'gerarpix') {
    const value = Number(options.getNumber('valor', true));
    if (!Number.isFinite(value) || value <= 0) {
      return interaction.reply({ content: '❌ | Informe um valor PIX maior que zero.', ephemeral: true });
    }
    const descricao = options.getString('descricao') || 'Pagamento avulso';
    const pixId = `PIX-${Date.now().toString(36).toUpperCase()}`;
    const payments = gs.payments || {};
    const pixKey = payments.manual?.pixKey
      || payments.efi?.pixKey
      || payments.efi?.key
      || payments.interImap?.pixKey
      || payments.nubankImap?.pixKey
      || payments.evopay?.pixKey
      || payments.mercadoPago?.pixKey;
    const codigoPix = gerarPixCopiaCola(pixKey, value, pixId);
    if (!codigoPix) {
      return interaction.reply({ content: '❌ | Nenhuma chave PIX válida está configurada. Configure a chave PIX antes de usar este comando.', ephemeral: true });
    }
    gs.pixCopyCodes ??= {};
    gs.pixCopyCodes[pixId] = codigoPix;
    return interaction.reply({
      embeds: [
        embed(
          'PIX gerado',
          [
            `**Valor:** \`${money(value)}\``,
            `**Descrição:** \`${descricao}\``,
            `**ID:** \`${pixId}\``,
            '',
            '**PIX Copia e Cola:**',
            codigoPix,
          ].join('\n'),
          guild,
          'Financeiro',
        ),
      ],
      components: [new ActionRowBuilder().addComponents(
        button(id('pix-copy', pixId), 'Copiar pix copia e cola', ButtonStyle.Primary),
      )],
    });
  }
  if (command === 'consultarpagamento') return interaction.reply({ content: `Pagamento \`${options.getString('id', true)}\`: \`Pendente/Não encontrado no ambiente local\`.`, ephemeral: true });
  if (command === 'cuponwin') return interaction.reply({ content: `Cupom \`${options.getString('codigo', true)}\` enviado para ${options.getUser('user', true)} com ${options.getNumber('desconto', true)}% de desconto.`, ephemeral: true });
  if (command === 'solicitarestoque') {
    const channel = options.getChannel('canal') || interaction.channel;
    if (!channel?.isTextBased()) return interaction.reply({ content: 'Canal inválido.', ephemeral: true });
    await channel.send(stockRequestPayload(guild));
    return interaction.reply({ content: `Painel de solicitação de estoque publicado em ${channel}.`, ephemeral: true });
  }

  if (command === 'condecoracoes') {
    if (!gs.badges.length) {
      return interaction.reply({ content: '| O sistema de condecorações está temporariamente desativado pelo administrador.', ephemeral: true });
    }
    const user = options.getUser('user') || interaction.user;
    const account = balanceUser(gs, user);
    return interaction.reply({ content: `${user} possui: ${account.badges.length ? account.badges.map((badge) => `\`${badge}\``).join(', ') : '`nenhuma condecoração`'}.`, ephemeral: true });
  }

  if (command === 'conceder-condecoracao') {
    const user = options.getUser('user', true);
    const name = options.getString('nome', true);
    const account = balanceUser(gs, user);
    if (!account.badges.includes(name)) account.badges.push(name);
    return interaction.reply({ content: `Condecoração \`${name}\` concedida para ${user}.`, ephemeral: true });
  }

  if (command === 'atualizar-condecoracoes') {
    const user = options.getUser('user', true);
    const account = balanceUser(gs, user);
    const earned = gs.badges.filter((badge) => Number(account.spent || 0) >= Number(badge.amount || 0)).map((badge) => badge.name);
    account.badges = [...new Set([...account.badges, ...earned])];
    return interaction.reply({ content: `Condecorações recalculadas para ${user}: ${account.badges.length || 0}.`, ephemeral: true });
  }

  if (command === 'convites') {
    if (!gs.automations.invite.enabled) {
      return interaction.reply({ content: 'O sistema de Invite Tracker está desativado no momento.', ephemeral: true });
    }
    const user = options.getUser('user') || interaction.user;
    const invite = gs.invitations[user.id] || { count: 0, fake: 0, leaves: 0 };
    return interaction.reply({ content: `${user}: \`${invite.count}\` convites, \`${invite.fake}\` fakes, \`${invite.leaves}\` saídas.`, ephemeral: true });
  }

  if (command === 'invites_reset') {
    if (options.getBoolean('todos')) {
      gs.invitations = {};
      return interaction.reply({ content: 'Convites de todos os membros foram resetados.', ephemeral: true });
    }
    const user = options.getUser('user') || interaction.user;
    gs.invitations[user.id] = { count: 0, fake: 0, leaves: 0 };
    return interaction.reply({ content: `Convites de ${user} foram resetados.`, ephemeral: true });
  }

  if (command === 'rank_convites') {
    if (!gs.automations.invite.enabled) {
      return interaction.reply({ content: 'O sistema de Invite Tracker está desativado no momento.', ephemeral: true });
    }
    return interaction.reply({ embeds: [inviteRankEmbed(guild, gs, options.getInteger('limite') || 10)], ephemeral: true });
  }

  if (command === 'vincular_assinatura') {
    const user = options.getUser('user', true);
    const plan = options.getString('plano', true);
    gs.subscriptions.push({ userId: user.id, plan, validUntil: options.getString('validade') || 'Indeterminado', at: Date.now() });
    return interaction.reply({ content: `Assinatura \`${plan}\` vinculada a ${user}.`, ephemeral: true });
  }

  if (command === 'vincular_clientes') return interaction.reply({ content: 'Sincronização do cargo de clientes concluída no clone local.', ephemeral: true });
  if (command === 'sincronizar_posicoes') return interaction.reply({ content: 'Cargos de posição sincronizados com base no valor gasto registrado.', ephemeral: true });
  if (command === 'sincronizar_permissoes') return interaction.reply({ content: 'Permissões dos canais sincronizadas com suas categorias no clone.', ephemeral: true });
  if (command === 'remove-feedback') return interaction.reply({ content: `Permissão de feedback removida para ${options.getUser('user', true)}.`, ephemeral: true });
  if (command === 'add_ticket') {
    const ticket = await exigirTicketDaEquipe(interaction, gs);
    if (!ticket) return;
    const user = options.getUser('user', true);
    if (user.id === ticket.userId || ticket.participants?.includes(user.id)) {
      return interaction.reply({ content: `${user} já participa deste ticket.`, ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    if (interaction.channel?.isThread?.()) await interaction.channel.members.add(user.id);
    else await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true });
    ticket.participants = [...new Set([...(ticket.participants || []), user.id])];
    return interaction.editReply({ embeds: [embed('✔ Usuário Adicionado', `O usuário ${user} foi adicionado ao ticket com sucesso!\n\nⓘ Ele agora pode ver e enviar mensagens neste ticket.`, guild, `Adicionado por ${interaction.user.username}`).setColor(0x39fc03)] });
  }
  if (command === 'remove_ticket') {
    const ticket = await exigirTicketDaEquipe(interaction, gs);
    if (!ticket) return;
    const user = options.getUser('user', true);
    if (user.id === ticket.userId) return interaction.reply({ content: '❌ | O criador do ticket não pode ser removido.', ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    if (interaction.channel?.isThread?.()) await interaction.channel.members.remove(user.id).catch(() => null);
    else await interaction.channel.permissionOverwrites.delete(user.id).catch(() => null);
    ticket.participants = (ticket.participants || []).filter((userId) => userId !== user.id);
    return interaction.editReply({ content: `✅ | ${user} foi removido deste ticket.` });
  }
  if (command === 'rename_ticket') {
    const ticket = await exigirTicketDaEquipe(interaction, gs);
    if (!ticket) return;
    const name = nomeCanalTicket(options.getString('nome', true));
    await interaction.channel.setName(name, `Ticket renomeado por ${interaction.user.tag}`);
    ticket.channelName = name;
    return interaction.reply({ content: `✅ | Ticket renomeado para \`${name}\`.`, ephemeral: true });
  }
  if (command === 'assumir_ticket') {
    const ticket = await exigirTicketDaEquipe(interaction, gs);
    if (!ticket) return;
    ticket.assignedTo = interaction.user.id;
    ticket.claimedBy = interaction.user.id;
    ticket.assignedAt = Date.now();
    const { embedTicketAssumidoInterno, embedTicketAssumidoDm, componentesTicketAssumidoDm } = await import('../logs/embeds-cliente.js');
    const owner = await guild.members.fetch(ticket.userId).catch(() => null);
    await owner?.send({ embeds: [embedTicketAssumidoDm({ guild, ticket, attendant: interaction.user })], components: componentesTicketAssumidoDm({ guild, ticket }) }).catch(() => null);
    return interaction.reply({ embeds: [embedTicketAssumidoInterno({ ticket, attendant: interaction.user })] });
  }
  if (command === 'transcript_ticket') {
    const ticket = await exigirTicketDaEquipe(interaction, gs);
    if (!ticket) return;
    const { montarTranscript } = await import('../logs/embeds-cliente.js');
    const transcript = await montarTranscript(interaction.channel, ticket);
    return interaction.reply({ content: '📄 | Transcript atual do ticket:', files: [{ attachment: Buffer.from(transcript, 'utf8'), name: `transcript-${String(ticket.id).slice(0, 12)}.txt` }], ephemeral: true });
  }
  if (command === 'archive_ticket' || command === 'close_ticket') {
    const ticket = await exigirTicketDaEquipe(interaction, gs);
    if (!ticket) return;
    await interaction.deferReply({ ephemeral: true });
    const fileName = await arquivarTicketSlash(interaction, ticket, command === 'close_ticket' ? options.getString('motivo') : null);
    await interaction.editReply({ content: `✅ | Ticket encerrado, arquivado e transcript \`${fileName}\` registrado.` });
    const timer = setTimeout(() => interaction.channel?.delete?.(`Ticket encerrado por ${interaction.user.tag}`).catch(() => null), 5_000);
    timer.unref?.();
    return;
  }
  if (command === 'closealltickets') {
    if (!isCartAdmin(interaction, gs)) return interaction.reply({ content: '❌ | Apenas a equipe pode fechar tickets.', ephemeral: true });
    const opened = gs.tickets.filter((ticket) => ticket.status === 'open');
    await interaction.deferReply({ ephemeral: true });
    const { montarTranscript } = await import('../logs/embeds-cliente.js');
    for (const ticket of opened) {
      const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
      ticket.transcriptContent = channel ? await montarTranscript(channel, ticket).catch(() => 'Transcript indisponível.') : 'Canal do ticket não encontrado.';
      ticket.status = 'archived';
      ticket.closedAt = Date.now();
      ticket.closedBy = interaction.user.id;
      await channel?.delete?.(`Fechamento geral por ${interaction.user.tag}`).catch(() => null);
    }
    return interaction.editReply({ content: `✅ | Total de \`${opened.length}\` tickets arquivados e canais encerrados.` });
  }
  if (command === 'clear') {
    if (!exigirPermissaoMod()) return;
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: '❌ | Eu preciso da permissão **Gerenciar Mensagens**.', ephemeral: true });
    }
    const amount = options.getInteger('quantidade', true);
    if (!interaction.channel?.bulkDelete) return interaction.reply({ content: '❌ | Este canal não permite apagar mensagens em massa.', ephemeral: true });
    const deleted = await interaction.channel.bulkDelete(amount, true);
    return interaction.reply({ content: `✅ | \`${deleted.size}\` mensagens apagadas.`, ephemeral: true });
  }
  if (command === 'lock') {
    if (!exigirPermissaoMod()) return;
    const channel = options.getChannel('canal') || interaction.channel;
    if (!channel?.permissionOverwrites?.edit) return interaction.reply({ content: '❌ | Este canal não pode ser trancado.', ephemeral: true });
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ | Eu preciso da permissão **Gerenciar Canais**.', ephemeral: true });
    const motivo = options.getString('motivo') || `Canal trancado por ${interaction.user.tag}`;
    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false, SendMessagesInThreads: false }, { reason: motivo });
    return interaction.reply({ content: `🔒 | Canal ${channel} trancado com sucesso.`, ephemeral: true });
  }
  if (command === 'unlock') {
    if (!exigirPermissaoMod()) return;
    const channel = options.getChannel('canal') || interaction.channel;
    if (!channel?.permissionOverwrites?.edit) {
      return interaction.reply({ content: '⚡ Este tipo de canal não pode ser destrancado.', ephemeral: true });
    }
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: '⚡ Eu preciso da permissão **Gerenciar Canais** para destrancar este canal.', ephemeral: true });
    }
    const motivo = options.getString('motivo') || `Canal destrancado por ${interaction.user.tag}`;
    await channel.permissionOverwrites.edit(guild.roles.everyone, {
      SendMessages: null,
      SendMessagesInThreads: null,
    }, { reason: motivo });
    return interaction.reply({ content: `⚡ Canal ${channel} destrancado com sucesso.`, ephemeral: true });
  }
  if (command === 'nuke') {
    if (!exigirPermissaoMod()) return;
    const channel = options.getChannel('canal') || interaction.channel;
    if (!channel?.clone || !channel?.delete) return interaction.reply({ content: '❌ | Este canal não pode ser recriado.', ephemeral: true });
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ | Eu preciso da permissão **Gerenciar Canais**.', ephemeral: true });
    await interaction.reply({ content: '💥 | Recriando o canal...', ephemeral: true });
    const cloned = await channel.clone({ reason: `Nuke executado por ${interaction.user.tag}` });
    await cloned.setPosition(channel.position).catch(() => null);
    await channel.delete(`Nuke executado por ${interaction.user.tag}`);
    await cloned.send(`💥 | Canal recriado por ${interaction.user}. Motivo: ${options.getString('motivo') || 'não informado'}.`);
    return;
  }
  if (command === 'cargoall' || command === 'roleall' || command === 'removercargoall') {
    if (!exigirPermissaoMod()) return;
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: '❌ | Eu preciso da permissão **Gerenciar Cargos**.', ephemeral: true });
    const role = options.getRole('cargo', true);
    if (role.id === guild.id || role.managed || role.position >= guild.members.me.roles.highest.position) {
      return interaction.reply({ content: '❌ | Não posso gerenciar esse cargo. Coloque meu cargo acima dele.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply({ content: `⏳ | Buscando os membros para ${command === 'removercargoall' ? 'remover' : 'adicionar'} o cargo ${role}...` });
    await guild.members.fetch();
    const remover = command === 'removercargoall';
    const membros = guild.members.cache.filter((member) => !member.user.bot && (remover ? member.roles.cache.has(role.id) : !member.roles.cache.has(role.id)));
    const total = membros.size;
    if (!total) {
      return interaction.editReply({ content: `✅ | Nenhum membro precisa ter o cargo ${role} ${remover ? 'removido' : 'adicionado'}.` });
    }
    await interaction.editReply({ content: `⏳ | Processando cargo ${role}: \`0/${total}\` membros.` });
    let sucesso = 0;
    let falhas = 0;
    let processados = 0;
    let ultimoProgresso = Date.now();
    for (const member of membros.values()) {
      try {
        if (remover) await member.roles.remove(role, `Comando /${command} por ${interaction.user.tag}`);
        else await member.roles.add(role, `Comando /${command} por ${interaction.user.tag}`);
        sucesso += 1;
      } catch {
        falhas += 1;
      }
      processados += 1;
      if (processados === total || Date.now() - ultimoProgresso >= 3_000) {
        await interaction.editReply({ content: `⏳ | Processando cargo ${role}: \`${processados}/${total}\` — sucessos: \`${sucesso}\`, falhas: \`${falhas}\`.` }).catch(() => null);
        ultimoProgresso = Date.now();
      }
    }
    return interaction.editReply({ content: `✅ | Cargo ${role} ${remover ? 'removido de' : 'adicionado a'} \`${sucesso}\` membros.${falhas ? ` Falhas: \`${falhas}\`.` : ''}` });
  }

  return interaction.reply({ content: 'Comando Zend mapeado no clone.', ephemeral: true });
}

  return {
    commandListEmbed,
    helpPanel,
    findProduct,
    findField,
    balanceUser,
    moveBalance,
    profileEmbed,
    purchasesEmbed,
    spendingRankEmbed,
    inviteRankEmbed,
    outOfStockEmbed,
    balancePublicPayload,
    stockRequestPayload,
    ticketManagerPanel,
    ticketStaffPanel,
    handleSlashCommand,
  };
}
