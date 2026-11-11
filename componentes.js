import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from './compat.js';
import { renderCustomEmojis, renderTextEmojis } from './emojis.js';
import { footerComCredito } from '../infraestrutura/creditos.js';

const EMOJIS_BRANCOS_BOTAO = new Map([
  ['✅', { id: '1529378856132415609', name: 'yuki_check' }],
  ['❌', { id: '1529378857575256175', name: 'yuki_error' }],
  ['⚠️', { id: '1529378855108739134', name: 'yuki_warning' }],
  ['🔄', { id: '1529378863891742910', name: 'yuki_refresh' }],
  ['⚙️', { id: '1529378865083056201', name: 'yuki_settings' }],
  ['➕', { id: '1529378868904067173', name: 'yuki_add' }],
  ['➖', { id: '1529378869746991277', name: 'yuki_subtract' }],
  ['🔍', { id: '1529378871080910899', name: 'yuki_search' }],
  ['📁', { id: '1529378872586539158', name: 'yuki_folder' }],
  ['🔔', { id: '1529378873727385651', name: 'yuki_bell' }],
  ['✏️', { id: '1529378875115835482', name: 'yuki_edit' }],
  ['💵', { id: '1529378858615439523', name: 'yuki_cash' }],
  ['🎟️', { id: '1529378862457290762', name: 'yuki_ticket' }],
  ['💠', { id: '1529378877682618509', name: 'yuki_pix' }],
  ['🏠', { id: '1529378878509027339', name: 'yuki_home' }],
  ['🔗', { id: '1529378880119636059', name: 'yuki_link' }],
  ['🎁', { id: '1529378881411350698', name: 'yuki_gift' }],
  ['👤', { id: '1529378882539749407', name: 'yuki_user' }],
  ['🧹', { id: '1529378883453845508', name: 'yuki_broom' }],
  ['🔑', { id: '1529378885932679383', name: 'yuki_key' }],
]);

function emojiBotao(emoji) {
  if (typeof emoji !== 'string') return emoji;
  return EMOJIS_BRANCOS_BOTAO.get(emoji) || renderCustomEmojis(emoji);
}

export function id(...parts) {
  return `zend:${parts.join(':')}`.slice(0, 100);
}

export function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function nowFooter(guild, label) {
  return { text: footerComCredito(guild?.name || 'Loja', label) };
}

export function embed(title, description, guild, label) {
  const titulo = Array.from(renderTextEmojis(title)).slice(0, 256).join('');
  const builder = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(titulo)
    .setFooter(nowFooter(guild, label))
    .setTimestamp();
  if (description) builder.setDescription(renderTextEmojis(description));
  return builder;
}

export function button(customId, label, style = ButtonStyle.Secondary, emoji, disabled = false) {
  const b = new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style).setDisabled(disabled);
  if (emoji) b.setEmoji(emojiBotao(emoji));
  return b;
}

export function linkButton(url, label, emoji) {
  const b = new ButtonBuilder().setURL(url).setLabel(label).setStyle(ButtonStyle.Link);
  if (emoji) b.setEmoji(emojiBotao(emoji));
  return b;
}

export function rows(...components) {
  const out = [];
  for (let i = 0; i < components.length; i += 5) {
    out.push(new ActionRowBuilder().addComponents(...components.slice(i, i + 5)));
  }
  return out;
}

export function textInput(customId, label, placeholder, style = TextInputStyle.Short, required = true, value) {
  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setPlaceholder(placeholder || ' ')
    .setStyle(style)
    .setRequired(required);
  if (value !== undefined && value !== null && String(value).length) input.setValue(String(value).slice(0, 4000));
  return input;
}

export function modal(customId, title, inputs) {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title)
    .addComponents(...inputs.map((input) => new ActionRowBuilder().addComponents(input)));
}
