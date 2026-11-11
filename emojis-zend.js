import fs from 'node:fs';
import path from 'node:path';

export const PASTA_EMOJIS_ZEND = path.join(process.cwd(), 'discord-emojis', 'upload');
export const PASTA_EMOJIS_ZEND_EXTERNOS = path.join(process.cwd(), '..', 'EMojis zend');
export const ARQUIVO_METADADOS_EMOJIS_ZEND = path.join(process.cwd(), 'discord-emojis', 'metadata.json');
export const ARQUIVO_CONFIGURACAO_EMOJIS = path.join(process.cwd(), 'emoji.json');
export const EXTENSOES_EMOJI_ZEND = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

// Arquivos escolhidos do pacote "EMojis zend" e os usos visuais que substituem.
export const CATALOGO_EMOJIS_ZEND_EXTERNOS = [
  ['add_2_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_add', ['Mais']],
  ['arrow_left_alt_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_left', ['SetaEsquerda', 'VoltarCurvo']],
  ['arrow_right_alt_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_right', ['SetaDireita', 'AvancarCurvo']],
  ['attach_money_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_money', ['Cifrao', 'Dinheiro']],
  ['bolsa-de-compras.png', 'zend_bag', ['Compras']],
  ['bot-de-mensagem.png', 'zend_botmsg', ['Mensagem', 'Robo']],
  ['calendario.png', 'zend_calendar', ['Calendario', 'CalendarioDestacavel', 'CalendarioEspiral']],
  ['campaign_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_campaign', ['Megafone', 'Som']],
  ['cancel_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_cancel', ['CancelarX', 'Erro']],
  ['carrinho-de-compras.png', 'zend_cart', ['CarrinhoUnicode']],
  ['celebration_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_party', ['Festa']],
  ['chat_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_chat', ['Conversa']],
  ['cloud_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_cloud', ['NuvemUnicode']],
  ['desbloquear.png', 'zend_unlock', ['CadeadoAberto']],
  ['despertador.png', 'zend_alarm', ['Alarme', 'RelogioUmaHora', 'RelogioNoveHoras']],
  ['device_thermostat_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_temp', ['Calor']],
  ['docs_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_docs', ['Documento', 'Marcadores']],
  ['e911_emergency_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_sos', ['Socorro']],
  ['error_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_error', ['Atencao', 'Informacao', 'Exclamacao', 'Vermelho', 'Amarelo']],
  ['featured_seasonal_and_gifts_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_gift', ['Presente']],
  ['folder_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_folder', ['PastaUnicode']],
  ['folder_open_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_folderopen', ['PastaAberta']],
  ['foto.png', 'zend_image', ['Imagem']],
  ['grafico-histograma.png', 'zend_chart', ['Grafico']],
  ['group_30dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png', 'zend_group', ['Grupo']],
  ['home_app_logo_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_home', ['Casa']],
  ['inventory_2_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_stock', ['Caixa']],
  ['lightbulb_2_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_idea', ['Ideia']],
  ['link-alt.png', 'zend_link', ['Corrente']],
  ['lixeira-xmark.png', 'zend_trash', ['LixeiraUnicode', 'LixeiraSimples']],
  ['local_activity_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_ticket', ['Ingresso', 'TicketUnicode']],
  ['location_on_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_pin', ['Localizacao', 'Alfinete', 'Bandeira']],
  ['military_tech_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_medal', ['Medalha', 'MedalhaMilitar', 'PrimeiroLugar', 'SegundoLugar', 'TerceiroLugar']],
  ['money_bag_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_moneybag', ['DinheiroVoando']],
  ['my_location_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_target', ['Alvo', 'Bussola']],
  ['notifications_unread_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_bell', ['Sino', 'SinoMudo']],
  ['palette_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_palette', ['Paleta']],
  ['payments_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_payment', ['NotaDinheiro']],
  ['person_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_user', ['Usuario']],
  ['pintar.png', 'zend_paint', ['Pincel']],
  ['remove_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_remove', ['Menos']],
  ['restart_alt_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_refresh', ['AtualizarUnicode', 'Trocar']],
  ['schedule_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_clock', ['Cronometro']],
  ['search_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_search', ['Pesquisar', 'Lupa']],
  ['security_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24 (1).png', 'zend_security', ['Escudo', 'PecaXadrez', 'PecaXadrezSimples', 'Fantasma', 'Martelo', 'Detetive']],
  ['sell_30dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png', 'zend_tag', ['Etiqueta']],
  ['send_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_send', ['Enviar']],
  ['settings_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_settings', ['Engrenagem', 'EngrenagemSimples']],
  ['shield_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_shield', ['Ferramentas']],
  ['star_shine_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_star', ['Estrela', 'RaioUnicode', 'Diamante', 'Azul', 'Roxo']],
  ['sticky_note_2_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_note', ['Prancheta', 'Anotacao']],
  ['stylus_note_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_edit', ['Lapis']],
  ['trancar.png', 'zend_lock', ['Cadeado']],
  ['trophy_30dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png', 'zend_trophy', ['Trofeu']],
  ['varinha-magica.png', 'zend_magic', ['VarinhaMagica', 'QuebraCabeca']],
  ['vassoura.png', 'zend_broom', ['Vassoura']],
  ['visibility_30dp_E3E3E3_FILL0_wght400_GRAD200_opsz24.png', 'zend_view', ['Olho']],
  ['wallet_30dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png', 'zend_wallet', ['Carteira']],
  ['check.png', 'check', ['Confirmado', 'Verde']],
  ['welcome.png', 'welcome', ['Aceno', 'Sorriso', 'Saudacao']],
  ['account.png', 'account', ['Cracha']],
  ['cloud.png', 'cloud', ['Satelite']],
  ['receipt.png', 'receipt', ['ReciboUnicode']],
];

export function carregarIdsEmojis() {
  try {
    return JSON.parse(fs.readFileSync(ARQUIVO_CONFIGURACAO_EMOJIS, 'utf8'));
  } catch (error) {
    throw new Error(`Nao foi possivel carregar emoji.json: ${error.message}`);
  }
}

export const SINCRONIA_EMOJI_ZEND = {
  escopo: 'application',
  origem: 'discord-emojis/upload',
  descricao: 'Os emojis ficam como arquivos locais e sao sincronizados no aplicativo do bot, sem usar slots do servidor.',
};
