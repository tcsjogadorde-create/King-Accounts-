import fs from 'node:fs/promises';
import path from 'node:path';
import { carregarIdsEmojis, CATALOGO_EMOJIS_ZEND_EXTERNOS, EXTENSOES_EMOJI_ZEND, PASTA_EMOJIS_ZEND, PASTA_EMOJIS_ZEND_EXTERNOS } from '../configuracoes/emojis-zend.js';

const EMOJI_ASSET_DIR = PASTA_EMOJIS_ZEND;
let salvarEstado = async () => {};

export function configurarPersistenciaEmoji(fn) {
  salvarEstado = typeof fn === 'function' ? fn : async () => {};
}

export const EMOJI = {
  store: '🛒',
  support: '🎫',
  welcome: '👋',
  refresh: '🔄',
  roller: '🎨',
  cloud: '☁️',
  receipt: '🧾',
  celebration: '🎉',
  settings: '⚙️',
  secured: '🛡️',
  plus: '<:plus:1427529469836660737>',
  title: '<:title:1326691544253726773>',
  left: '⬅️',
  check: '✅',
  cancel: '✖️',
  trash: '🗑️',
  fields: '📋',
  coupon: '🎟️',
  visible: '<:visible:1326690890449813588>',
  heart: '<:hearth:1326690846405300224>',
  role: '<:role:1326691243253698640>',
  pin: '📌',
  stock: '📦',
  search: '🔎',
  route: '🧭',
  wallet: '<:wallet:1326691393866961038>',
  clock: '<:clock:1326690798581977098>',
  warning: 'ℹ️',
  lightning: '<:lightning:1326690855091699772>',
  forum: '<:forum:1326691210433400883>',
  sparks: '<:sparks:1326691101469573152>',
  activity: '<:activity:1326691180179619873>',
  shield: '🛡️',
  verifiedDuo: '✅',
  genesisClock: '⏱️',
  lockEmoji: '🔒',
  unlockEmoji: '🔓',
  syncMessages: '📑',
};

Object.assign(EMOJI, {
  store: '<:store:1326691404646453248>',
  support: '<:support:1328931053364183081>',
  welcome: '<:welcome:1415098749528838184>',
  refresh: '<a:refresh:1321317638328160256>',
  roller: '<:roller:1326691095475654747>',
  cloud: '<:cloud:1326690954601566299>',
  receipt: '<:receipt:1326691401211056248>',
  celebration: '<a:celebration:1321317631923327027>',
  settings: '<:settings:1326690879729307669>',
  secured: '<:Secured:1415098066251415664>',
  plus: '<:plus:1427529469836660737>',
  title: '<:title:1326691544253726773>',
  left: '<:left:1326690853510451295>',
  check: '<:check:1326690796992204850>',
  cancel: '✖️',
  trash: '🗑️',
  fields: '📋',
  coupon: '🎟️',
  visible: '<:visible:1326690890449813588>',
  heart: '<:hearth:1326690846405300224>',
  role: '<:role:1326691243253698640>',
  pin: '📌',
  stock: '📦',
  search: '🔎',
  route: '🧭',
  wallet: '<:wallet:1326691393866961038>',
  clock: '<:clock:1326690798581977098>',
  warning: '<:infogenesiss:1518014522344869928>',
  lightning: '<:lightning:1326690855091699772>',
  forum: '<:forum:1326691210433400883>',
  sparks: '<:sparks:1326691101469573152>',
  activity: '<:activity:1326691180179619873>',
  shield: '🛡️',
  verifiedDuo: '✅',
  genesisClock: '⏱️',
  lockEmoji: '🔒',
  unlockEmoji: '🔓',
  syncMessages: '📑',
  genesisTicket: '<:genesisTicket:1518014529546616962>',
  seta: '<a:setaAnimada:1518014526111481927>',
  yes: '<:genesisYes:1518014527176966184>',
  no: '<:genesisNoC:1518014528426741951>',
  verified: '<:verifieldgenesiss:1518014521032048740>',
  loading: '<a:loadinggenesiss:1518014523049508924>',
  memberCloud: '<:zendMemberGr:1518014537360609412>',
  backup: '<:zendBackupEmoji:1518014539596042352>',
  folder: '<:folder:1326691072272764929>',
  users: '<:users:1326691236685283368>',
  url: '<:url:1326691538767450233>',
  trashcan: '<:trashcan:1326691250543398913>',
  yesgenesis: '<:yesgenesiss:1518014523934511135>',
  account: '<:account:1326690792302973071>',
  syncBlue: '<:Sincronizar:1238303687248576544>',
  syncGreen: '<:Sincronizar:1259569896472182784>',
  edit: '<:Editar:1237192698746634331>',
  textChannel: '<:textc:1326691248555167765>',
  activityIcon: '<:activity:1326691180179619873>',
  redTrash: '<:lixeiraRed:1518014521778901203>',
  cartLoaded: '<:icons8carrinhodecomprascarregado:1467991304268152965>',
  giveaway: '<a:zendGiveaway:1518014540565053520>',
  notifyMember: '<:2904notifymember:1415393789337538650>',
  upload: '<:upload:1415098265589907476>',
  efi: '<:efi:1306786969652564091>',
  mercadoPago: '<:imp_mercadopago:1295039458403553340>',
  pix: '<:p7dro_pix:1307033195069444116>',
  pushInPay: '<:pushInPay:1415412932480729098>',
  litecoin: '<:imp_llitecoin:1256710417343053866>',
  bank: '<:banco2:1328931951846883338>',
  carrinhoZend: '<:carrinhoZend:1463985148348465336>',
  ea1: '<:ea1:1518014575738359829>',
  ea2: '<:ea2:1518014584407986256>',
  ea3: '<:ea3:1518014593157435533>',
  ea4: '<:ea4:1518014601579593890>',
  ea5: '<:ea5:1518014609376678112>',
  ea6: '<:ea6:1518014618033717248>',
  ea7: '<:ea7:1518014626594427021>',
  ea8: '<:ea8:1518014721339429014>',
  zendCart: '<:zendCart:1518014548903198845>',
  zendPay: '<:zendPay:1518014549989789790>',
  aceitar: '<:Aceitar:1237192700273365114>',
  ticketZend: '<:Ticket:1236447625675407463>',
  deleteZend: '<:delete:1246953338541441036>',
  pixZend: '<:Pix:1238293609380450304>',
  litecoinZend: '<:litecoinemojidocalai:1256688031088513064>',
  cardZend: '<:cpfnanotaeolhela:1256688008653045831>',
  arrowZend: '<:Arrow:1237191329432211468>',
  copiaCola: '<:copicola:1192868868784394381>',
  entregaSucess: '<:entregaSucess:1518014525398454282>',
  editStock: '<:editestoque:1187479020040884286>',
  interBank: '<:interBank:1529867218052186183>',
  nubankBank: '<:nubankBank:1529867219562004571>',
});

// Nomes amigaveis do emoji.json -> chaves usadas internamente pelo bot.
// Para trocar um emoji, altere somente o ID no emoji.json.
const CATALOGO_EMOJIS = {
  MenuPosicoes: ['menuPosicoes', 'zend_trophy'], MenuSistemaDeSaldo: ['menuSistemaDeSaldo', 'zend_wallet'],
  MenuCupons: ['menuCupons', 'zend_ticket'], MenuCondecoracoes: ['menuCondecoracoes', 'zend_medal'],
  MenuCargoTemporario: ['menuCargoTemporario', 'role'], MenuOAuth2: ['menuOAuth2', 'zend_cloud'],
  Loja: ['store', 'store'], Suporte: ['support', 'support'], BoasVindas: ['welcome', 'welcome'],
  Atualizar: ['refresh', 'refresh', true], Personalizar: ['roller', 'roller'], Nuvem: ['cloud', 'cloud'],
  Recibo: ['receipt', 'receipt'], Celebracao: ['celebration', 'celebration', true], Configuracoes: ['settings', 'settings'],
  Seguro: ['secured', 'Secured'], Adicionar: ['plus', 'plus'], Titulo: ['title', 'title'], Voltar: ['left', 'left'],
  Confirmar: ['check', 'check'], Visivel: ['visible', 'visible'], Coracao: ['heart', 'hearth'], Cargo: ['role', 'role'],
  Carteira: ['wallet', 'wallet'], Relogio: ['clock', 'clock'], Aviso: ['warning', 'infogenesiss'], Raio: ['lightning', 'lightning'],
  Forum: ['forum', 'forum'], Destaques: ['sparks', 'sparks'], Atividade: ['activity', 'activity'], Ticket: ['genesisTicket', 'genesisTicket'],
  SetaAnimada: ['seta', 'setaAnimada', true], Sim: ['yes', 'genesisYes'], Nao: ['no', 'genesisNoC'],
  Verificado: ['verified', 'verifieldgenesiss'], Carregando: ['loading', 'loadinggenesiss', true],
  MembroCloud: ['memberCloud', 'zendMemberGr'], Backup: ['backup', 'zendBackupEmoji'], Pasta: ['folder', 'folder'],
  Usuarios: ['users', 'users'], Link: ['url', 'url'], Lixeira: ['trashcan', 'trashcan'], Sucesso: ['yesgenesis', 'yesgenesiss'],
  Conta: ['account', 'account'], SincronizarAzul: ['syncBlue', 'Sincronizar'], SincronizarVerde: ['syncGreen', 'Sincronizar'],
  Editar: ['edit', 'Editar'], CanalDeTexto: ['textChannel', 'textc'], LixeiraVermelha: ['redTrash', 'lixeiraRed'],
  CarrinhoCarregado: ['cartLoaded', 'icons8carrinhodecomprascarregado'], Sorteio: ['giveaway', 'zendGiveaway', true],
  NotificarMembro: ['notifyMember', '2904notifymember'], Upload: ['upload', 'upload'], Efi: ['efi', 'efi'],
  MercadoPago: ['mercadoPago', 'imp_mercadopago'], PixGateway: ['pix', 'p7dro_pix'], PushInPay: ['pushInPay', 'pushInPay'],
  LitecoinGateway: ['litecoin', 'imp_llitecoin'], Banco: ['bank', 'banco2'], SincronizarMensagens: ['syncMessages', 'syncMessages'],
  CarrinhoZend: ['carrinhoZend', 'carrinhoZend'], Etapa1: ['ea1', 'ea1'], Etapa2: ['ea2', 'ea2'], Etapa3: ['ea3', 'ea3'],
  Etapa4: ['ea4', 'ea4'], Etapa5: ['ea5', 'ea5'], Etapa6: ['ea6', 'ea6'], Etapa7: ['ea7', 'ea7'], Etapa8: ['ea8', 'ea8'],
  ResumoCarrinho: ['zendCart', 'zendCart'], PagamentoZend: ['zendPay', 'zendPay'], Aceitar: ['aceitar', 'Aceitar'],
  Cupom: ['ticketZend', 'zend_ticket'], Excluir: ['deleteZend', 'delete'], Pix: ['pixZend', 'Pix'],
  Litecoin: ['litecoinZend', 'litecoinemojidocalai'], Cartao: ['cardZend', 'cpfnanotaeolhela'], Seta: ['arrowZend', 'Arrow'],
  CopiaECola: ['copiaCola', 'copicola'], EntregaRealizada: ['entregaSucess', 'entregaSucess'], EditarEstoque: ['editStock', 'editestoque'],
};

const idsEmojis = carregarIdsEmojis();
const IDS_EMOJIS_SERVIDOR = new Set(
  Object.values(idsEmojis.IdsServidor || {})
    .map((configuracao) => Array.isArray(configuracao) ? String(configuracao[1] || '') : '')
    .filter((emojiId) => /^\d{17,20}$/.test(emojiId)),
);
const SUBSTITUICOES_UNICODE = new Map();
const SUBSTITUICOES_TEXTO_SERVIDOR = new Map();
const EMOJIS_EXTERNOS_SINCRONIZADOS = {};
const IDS_EMOJIS_TEXTO_ATUAIS = new Set();
const ALIASES_EMOJIS_EXTERNOS = Object.fromEntries(
  CATALOGO_EMOJIS_ZEND_EXTERNOS.flatMap(([, nome, usos]) => usos.map((uso) => [uso, nome])),
);

const SERVIDOR_POR_NOME = {};
const vincularServidor = (chave, ...nomes) => nomes.forEach((nome) => { SERVIDOR_POR_NOME[nome] = chave; });
vincularServidor('aviso', 'Informacao', 'Atencao', 'Exclamacao', 'Amarelo');
vincularServidor('atualizar', 'Trocar', 'AtualizarUnicode'); vincularServidor('esquerda', 'VoltarCurvo', 'SetaEsquerda');
vincularServidor('direita', 'AvancarCurvo', 'SetaDireita'); vincularServidor('relogio', 'Alarme', 'Cronometro', 'RelogioUmaHora', 'RelogioNoveHoras', 'Calendario', 'CalendarioDestacavel', 'CalendarioEspiral');
vincularServidor('seguranca', 'PecaXadrez', 'PecaXadrezSimples', 'Escudo', 'Fantasma', 'Martelo', 'Detetive', 'Bandeira');
vincularServidor('configuracao', 'Calor', 'Engrenagem', 'EngrenagemSimples', 'Ferramentas', 'QuebraCabeca');
vincularServidor('estrela', 'RaioUnicode', 'Estrela', 'Diamante', 'Azul', 'Roxo', 'Satelite');
vincularServidor('confirmar', 'Confirmado', 'Verde', 'Aceno', 'Sorriso', 'Saudacao'); vincularServidor('cancelar', 'CancelarX', 'Erro', 'Vermelho');
vincularServidor('adicionar', 'Mais'); vincularServidor('remover', 'Menos'); vincularServidor('presente', 'Presente'); vincularServidor('festa', 'Festa');
vincularServidor('medalha', 'MedalhaMilitar', 'Medalha', 'PrimeiroLugar', 'SegundoLugar', 'TerceiroLugar'); vincularServidor('ticket', 'Ingresso', 'TicketUnicode'); vincularServidor('trofeu', 'Trofeu');
vincularServidor('casa', 'Casa'); vincularServidor('etiqueta', 'Etiqueta', 'Cracha'); vincularServidor('olho', 'Olho'); vincularServidor('usuario', 'Usuario'); vincularServidor('grupo', 'Grupo');
vincularServidor('cifrao', 'Cifrao'); vincularServidor('dinheiro', 'Dinheiro', 'DinheiroVoando'); vincularServidor('pagamento', 'NotaDinheiro');
vincularServidor('pasta', 'PastaUnicode'); vincularServidor('pastaAberta', 'PastaAberta'); vincularServidor('documento', 'Documento', 'Prancheta', 'Marcadores', 'Anotacao', 'ReciboUnicode');
vincularServidor('localizacao', 'Localizacao', 'Alfinete'); vincularServidor('alvo', 'Alvo', 'Bussola'); vincularServidor('megafone', 'Megafone', 'Som');
vincularServidor('conversa', 'Conversa'); vincularServidor('enviar', 'Enviar', 'Mensagem'); vincularServidor('estoque', 'Caixa'); vincularServidor('ideia', 'Ideia'); vincularServidor('sino', 'Sino', 'SinoMudo');
vincularServidor('paleta', 'Paleta', 'Pincel'); vincularServidor('editar', 'Lapis'); vincularServidor('imagem', 'Imagem'); vincularServidor('grafico', 'Grafico');
vincularServidor('lixeira', 'LixeiraUnicode', 'LixeiraSimples'); vincularServidor('carrinho', 'CarrinhoUnicode'); vincularServidor('compras', 'Compras'); vincularServidor('vassoura', 'Vassoura');
vincularServidor('robo', 'Robo'); vincularServidor('cadeado', 'Cadeado'); vincularServidor('desbloqueado', 'CadeadoAberto'); vincularServidor('nuvem', 'NuvemUnicode'); vincularServidor('socorro', 'Socorro');

function aplicarEmojisSemId() {
  for (const [nome, configuracao] of Object.entries(idsEmojis.EmojisSemId || {})) {
    const padrao = configuracao?.padrao;
    // Tambem reconhece, por seguranca, quando o ID foi usado acidentalmente como nome do campo.
    const idComoChave = Object.keys(configuracao || {}).find((chave) => /^\d{17,20}$/.test(chave));
    const idDoPacote = idsEmojis.EmojisDoPacoteZend?.[nome];
    const emojiId = String(idDoPacote || configuracao?.id || idComoChave || EMOJIS_EXTERNOS_SINCRONIZADOS[ALIASES_EMOJIS_EXTERNOS[nome]] || '').trim();
    const nomeDiscord = idDoPacote && ALIASES_EMOJIS_EXTERNOS[nome] ? ALIASES_EMOJIS_EXTERNOS[nome] : nome.slice(0, 32);
    if (!padrao) continue;
    const valor = emojiId
      ? (/^\d{17,20}$/.test(emojiId) ? emojiTag(nomeDiscord, emojiId, Boolean(configuracao.animado)) : padrao)
      : padrao;
    EMOJI[`unicode${nome}`] = valor;
    SUBSTITUICOES_UNICODE.set(padrao, valor);
    const [nomeServidor, idServidor] = idsEmojis.IdsServidor?.[SERVIDOR_POR_NOME[nome]] || [];
    if (nomeServidor && idServidor) SUBSTITUICOES_TEXTO_SERVIDOR.set(padrao, emojiTag(nomeServidor, idServidor));
  }
}

function aplicarCatalogoEmojis() {
  for (const [nomeAmigavel, [chave, nomeDiscord, animado = false]] of Object.entries(CATALOGO_EMOJIS)) {
    const emojiId = idsEmojis.IdsAplicacao?.[nomeDiscord] || idsEmojis.EmojisDoPacoteZend?.[nomeAmigavel] || idsEmojis[nomeAmigavel];
    if (!/^\d{17,20}$/.test(emojiId || '')) {
      throw new Error(`ID invalido ou ausente no emoji.json: ${nomeAmigavel}`);
    }
    EMOJI[chave] = emojiTag(nomeDiscord, emojiId, animado);
  }
  // Esta faixa aparece em mensagens normais, entao usa os emojis do servidor.
  for (let index = 1; index <= 8; index += 1) {
    const [nomeServidor, idServidor] = idsEmojis.IdsServidor?.[`ea${index}`] || [];
    if (nomeServidor && /^\d{17,20}$/.test(idServidor || '')) {
      EMOJI[`ea${index}`] = emojiTag(nomeServidor, idServidor);
    }
  }
  const yuki = idsEmojis.EmojisYuki || {};
  const aplicarYuki = (nome, ...chaves) => {
    const [nomeDiscord, emojiId] = yuki[nome] || [];
    if (!nomeDiscord || !/^\d{17,20}$/.test(emojiId || '')) return;
    const tag = emojiTag(nomeDiscord, emojiId);
    for (const chave of chaves) EMOJI[chave] = tag;
  };
  aplicarYuki('Cadeado', 'lockEmoji');
  aplicarYuki('Desbloqueado', 'unlockEmoji');
  aplicarYuki('Aviso', 'warning');
  aplicarYuki('Confirmar', 'check', 'yes', 'verified', 'yesgenesis', 'aceitar');
  aplicarYuki('Erro', 'no', 'cancel');
  aplicarYuki('Dinheiro', 'wallet', 'bank');
  aplicarYuki('Sorteio', 'giveaway');
  aplicarYuki('Email', 'mail');
  aplicarYuki('Ticket', 'support', 'genesisTicket', 'ticketZend', 'coupon');
  aplicarYuki('Atualizar', 'refresh', 'syncBlue', 'syncGreen');
  aplicarYuki('Configuracoes', 'settings');
  aplicarYuki('Membro', 'users', 'memberCloud');
  aplicarYuki('Voltar', 'left');
  aplicarYuki('Adicionar', 'plus');
  aplicarYuki('Remover', 'minus');
  aplicarYuki('Pesquisar', 'search');
  aplicarYuki('Pasta', 'folder');
  aplicarYuki('Notificacao', 'notifyMember');
  aplicarYuki('Editar', 'edit', 'editStock');
  aplicarYuki('BancoDados', 'backup');
  aplicarYuki('Pix', 'pix', 'pixZend');
  aplicarYuki('Inicio', 'store', 'home');
  aplicarYuki('Link', 'url');
  aplicarYuki('Presente', 'gift');
  aplicarYuki('Usuario', 'account', 'role');
  aplicarYuki('Limpeza', 'broom');
  aplicarYuki('Canal', 'textChannel');
  aplicarYuki('Chave', 'secured', 'shield');
  EMOJI.activityIcon = EMOJI.activity;
  aplicarEmojisSemId();
}

aplicarCatalogoEmojis();

export const POSITION_LIMIT = 5;
export const POSITION_EMOJIS = ['🥇', '🥈', '🥉', '🏅', '🎖️'];

export const EMOJI_FILE_EXTENSIONS = EXTENSOES_EMOJI_ZEND;
export const EMOJI_ALIASES = {
  infogenesiss: ['warning'],
  genesisPrancheta: ['clipboard'],
  zendTrofeu: ['trophy'],
  zendUsers: ['users'],
  genesisYes: ['yes'],
  genesisNoC: ['no'],
  yesgenesiss: ['yesgenesis'],
  setaAnimada: ['seta'],
  Aceitar: ['aceitar'],
  Ticket: ['ticketZend'],
  delete: ['deleteZend'],
  Pix: ['pixZend'],
  litecoinemojidocalai: ['litecoinZend'],
  cpfnanotaeolhela: ['cardZend'],
  Arrow: ['arrowZend'],
  copicola: ['copiaCola'],
  editestoque: ['editStock'],
  lixeiraRed: ['redTrash'],
  activity: ['activityIcon'],
  Sincronizar: ['syncBlue', 'syncGreen'],
  syncMessages: ['syncMessages'],
  genesisVerifieldDuo: ['verifiedDuo'],
  genesisClock: ['genesisClock'],
  lockEmoji: ['lockEmoji'],
  unlockEmoji: ['unlockEmoji'],
};

export const EMOJI_ALIAS_FALLBACKS = {
  clipboard: '📋',
  trophy: '🏆',
};

export function renderCustomEmojis(text) {
  if (typeof text !== 'string') return text;
  let renderizado = text.replace(/:([A-Za-z0-9_]+):/g, (match, name, offset, fullText) => {
    if (fullText[offset - 1] === '<' || fullText.slice(offset - 2, offset) === '<a') return match;
    const aliases = EMOJI_ALIASES[name] || [name];
    for (const alias of aliases) {
      if (EMOJI[alias]) return EMOJI[alias];
      if (EMOJI[`unicode${alias}`]) return EMOJI[`unicode${alias}`];
      if (EMOJI_ALIAS_FALLBACKS[alias]) return EMOJI_ALIAS_FALLBACKS[alias];
    }
    return match;
  });
  for (const [unicode, emoji] of SUBSTITUICOES_UNICODE) {
    if (unicode !== emoji) renderizado = renderizado.split(unicode).join(emoji);
  }
  return renderizado;
}

function fallbackEmojiTexto(nome) {
  const valor = nome.toLowerCase();
  if (/^ea[1-8]$/.test(valor)) return '▰';
  if (/no|cancel|error/.test(valor)) return '❌';
  if (/trash|lixeira|delete/.test(valor)) return '🗑️';
  if (/yes|check|verif|aceitar/.test(valor)) return '✅';
  if (/ticket|support/.test(valor)) return '🎟️';
  if (/left/.test(valor)) return '⬅️';
  if (/seta|arrow/.test(valor)) return '➡️';
  if (/loading/.test(valor)) return '🕘';
  if (/clock|alarm/.test(valor)) return '🕘';
  if (/folder/.test(valor)) return '📁';
  if (/user|member|account/.test(valor)) return '👤';
  if (/wallet|pay|bank|money/.test(valor)) return '💰';
  if (/cart|carrinho/.test(valor)) return '🛒';
  if (/cloud|backup/.test(valor)) return '☁️';
  if (/settings/.test(valor)) return '⚙️';
  if (/edit|stylus/.test(valor)) return '✏️';
  if (/info|warning|error/.test(valor)) return 'ℹ️';
  if (/plus|add/.test(valor)) return '➕';
  if (/store|bag/.test(valor)) return '🛍️';
  if (/unlock/.test(valor)) return '🔓';
  if (/role|shield|security|secured|lock/.test(valor)) return '🔒';
  if (/gift|giveaway|celebration|party/.test(valor)) return '🎉';
  if (/trophy|medal/.test(valor)) return '🏆';
  if (/stock|inventory|caixa/.test(valor)) return '📦';
  if (/receipt|docs|note|clipboard|prancheta/.test(valor)) return '📋';
  if (/search|visible|view/.test(valor)) return '🔎';
  if (/refresh|sync/.test(valor)) return '🔄';
  return 'ℹ️';
}

// Emojis personalizados podem pertencer a outra aplicacao ou servidor e aparecer
// como :nome_do_emoji: em embeds/mensagens. Em texto, sempre usamos um fallback
// Unicode legivel; componentes continuam usando os emojis personalizados.
function renderTextSegment(text) {
  let renderizado = renderCustomEmojis(text);
  for (const [unicode, custom] of SUBSTITUICOES_UNICODE) {
    if (custom !== unicode) renderizado = renderizado.split(custom).join(unicode);
  }
  renderizado = renderizado.replace(/<a?:([^:>]+):(\d{17,20})>/g, (tag, nome, emojiId) => (
    IDS_EMOJIS_TEXTO_ATUAIS.has(emojiId) ? tag : fallbackEmojiTexto(nome)
  ));
  // O Discord exibe tags de emoji literalmente quando estao dentro de `codigo`.
  // Move os emojis para fora das crases e preserva o restante como codigo inline.
  return renderizado.replace(/`([^`\n]+)`/g, (trecho, conteudo) => {
    const emojis = [...conteudo.matchAll(/<a?:[^:>]+:\d{17,20}>/g)].map((item) => item[0]);
    if (!emojis.length) return trecho;
    const textoCodigo = conteudo.replace(/<a?:[^:>]+:\d{17,20}>/g, '').trim();
    return `${emojis.join(' ')}${textoCodigo ? ` \`${textoCodigo}\`` : ''}`;
  });
}

export function renderTextEmojis(text) {
  if (typeof text !== 'string') return text;
  // Nao altera conteudo de blocos ```...```, que pode conter dados entregues ao usuario.
  return text
    .split(/(```[\s\S]*?```)/g)
    .map((trecho) => (trecho.startsWith('```') ? trecho : renderTextSegment(trecho)))
    .join('');
}

// Labels e placeholders do Discord nao aceitam tags de emoji personalizado.
// Remove qualquer icone embutido; o emoji deve ser enviado no campo `emoji` do componente.
export function limparTextoComponente(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/<a?:[^:>]+:\d{17,20}>/g, '')
    .replace(/:([A-Za-z_][A-Za-z0-9_]*):/g, '')
    .replace(/\p{Extended_Pictographic}\uFE0F?/gu, '')
    .replace(/[\u2190-\u2BFF]\uFE0F?/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function emojiTag(name, emojiId, animated = false) {
  return `<${animated ? 'a' : ''}:${name}:${emojiId}>`;
}

export function normalizeEmojiName(fileName) {
  const clean = path.parse(fileName).name.replace(/[^\w]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return (clean || 'zendemoji').slice(0, 32);
}

export function applySyncedEmojiOverrides(gs) {
  const synced = gs?.emojis?.synced || {};
  const animated = gs?.emojis?.animated || {};
  IDS_EMOJIS_TEXTO_ATUAIS.clear();
  for (const emojiId of Object.values(synced)) {
    if (/^\d{17,20}$/.test(String(emojiId))) IDS_EMOJIS_TEXTO_ATUAIS.add(String(emojiId));
  }
  for (const [name, emojiId] of Object.entries(synced)) {
    const tag = emojiTag(name, emojiId, Boolean(animated[name]));
    EMOJI[name] = tag;
    for (const alias of EMOJI_ALIASES[name] || []) EMOJI[alias] = tag;
    if (Object.values(ALIASES_EMOJIS_EXTERNOS).includes(name)) EMOJIS_EXTERNOS_SINCRONIZADOS[name] = emojiId;
  }
  // IDs definidos manualmente no emoji.json sempre tem prioridade.
  aplicarCatalogoEmojis();
}

export async function localEmojiFiles() {
  const entries = await fs.readdir(EMOJI_ASSET_DIR, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const seen = new Set();
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!EMOJI_FILE_EXTENSIONS.has(ext)) continue;
    const name = normalizeEmojiName(entry.name);
    if (seen.has(name)) continue;
    seen.add(name);
    files.push({
      name,
      animated: ext === '.gif',
      path: path.join(EMOJI_ASSET_DIR, entry.name),
    });
  }
  for (const [arquivo, name] of CATALOGO_EMOJIS_ZEND_EXTERNOS) {
    if (seen.has(name)) continue;
    const filePath = path.join(PASTA_EMOJIS_ZEND_EXTERNOS, arquivo);
    const disponivel = await fs.access(filePath).then(() => true).catch(() => false);
    if (!disponivel) continue;
    seen.add(name);
    files.push({ name, animated: path.extname(arquivo).toLowerCase() === '.gif', path: filePath });
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

export function syncedEmojiOptions(gs) {
  return Object.entries(gs.emojis?.synced || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 25)
    .map(([name, emojiId]) => ({
      label: name,
      value: name,
      emoji: { name, id: emojiId, animated: Boolean(gs.emojis?.animated?.[name]) },
    }));
}

export function emojiSyncSummary(result) {
  return [
    `${EMOJI.yes || 'OK'} Emojis do clone Zend sincronizados no aplicativo do bot.`,
    'Os arquivos continuam em `discord-emojis/upload` e nao ocupam limite de emojis do servidor.',
    `Criados: \`${result.created.length}\``,
    `Reutilizados: \`${result.reused.length}\``,
    `Falhas: \`${result.failed.length}\``,
    result.failed.length ? result.failed.map((item) => `- ${item.name}: ${item.error}`).join('\n') : '',
  ].filter(Boolean).join('\n');
}

export async function syncLocalEmojis(guild, gs, onProgress) {
  const files = await localEmojiFiles();
  if (!files.length) {
    return { created: [], reused: [], failed: [{ name: 'discord-emojis/upload', error: 'Nenhum arquivo de emoji local encontrado.' }] };
  }

  const application = guild.client.application;
  if (!application?.emojis?.fetch || !application?.emojis?.create) {
    return { created: [], reused: [], failed: [{ name: 'aplicacao', error: 'A versao atual do cliente nao suporta emojis de aplicacao.' }] };
  }

  await application.emojis.fetch().catch(() => null);
  gs.emojis ??= { synced: {}, animated: {}, lastSyncAt: null };
  gs.emojis.synced ??= {};
  gs.emojis.animated ??= {};
  gs.emojis.scope = 'application';

  const result = { created: [], reused: [], failed: [] };
  for (const file of files) {
    const existing = application.emojis.cache.find((emoji) => emoji.name === file.name);
    if (existing) {
      gs.emojis.synced[file.name] = existing.id;
      gs.emojis.animated[file.name] = existing.animated ?? file.animated;
      result.reused.push(file.name);
      gs.emojis.lastSyncAt = Date.now();
      applySyncedEmojiOverrides(gs);
      await salvarEstado();
      onProgress?.({ status: 'reused', name: file.name });
      continue;
    }

    try {
      const created = await application.emojis.create({
        attachment: file.path,
        name: file.name,
      });
      gs.emojis.synced[file.name] = created.id;
      gs.emojis.animated[file.name] = created.animated ?? file.animated;
      result.created.push(file.name);
      gs.emojis.lastSyncAt = Date.now();
      applySyncedEmojiOverrides(gs);
      await salvarEstado();
      onProgress?.({ status: 'created', name: file.name });
    } catch (error) {
      result.failed.push({ name: file.name, error: error.message });
      onProgress?.({ status: 'failed', name: file.name, error: error.message });
    }
  }

  gs.emojis.lastSyncAt = Date.now();
  applySyncedEmojiOverrides(gs);
  await salvarEstado();
  return result;
}
