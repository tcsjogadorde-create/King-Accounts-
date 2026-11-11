/**
 * Mensagens de sistema no canal — visual igual ao print:
 * - Limpeza automática
 * - Canal trancado / destrancado
 */

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from '../discord/compat.js';
import { renderCustomEmojis, renderTextEmojis } from '../discord/emojis.js';

const COR_SISTEMA = 0xffffff;

function chip(label, style = ButtonStyle.Secondary, emoji, disabled = true) {
  const b = new ButtonBuilder()
    .setCustomId(`zend:sys-chip:${Math.random().toString(36).slice(2, 9)}`)
    .setLabel(label.slice(0, 80))
    .setStyle(style)
    .setDisabled(disabled);
  if (emoji) b.setEmoji(emoji);
  return b;
}

/** 🗑️ Total de N mensagens removidas. + botão "Limpeza automática" */
export function payloadLimpezaAutomatica(removidas) {
  const total = Number(removidas) || 0;
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(COR_SISTEMA)
        .setDescription(renderTextEmojis(`🗑️ Total de **${total}** mensagens removidas.`)),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        chip('Limpeza automática', ButtonStyle.Secondary, null, true),
      ),
    ],
  };
}

/** 🔒 Canal trancado automaticamente */
export function payloadCanalTrancado(unlockTimestamp = null) {
  const unix = Number(unlockTimestamp) > 0 ? Math.floor(Number(unlockTimestamp) / 1000) : null;
  const proximoUnlock = unix
    ? `\n\n🕘 **Destranque automático:** <t:${unix}:F> (<t:${unix}:R>)`
    : '';
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(COR_SISTEMA)
        .setDescription(renderTextEmojis(`🔒 Este canal foi **trancado automaticamente** pelo sistema.${proximoUnlock}`)),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        chip('Mensagem do sistema', ButtonStyle.Secondary, null, true),
        new ButtonBuilder()
          .setCustomId('zend:sys-unlock')
          .setLabel('Destrancar canal')
          .setStyle(ButtonStyle.Success)
          .setEmoji(renderCustomEmojis('🔓')),
      ),
    ],
  };
}

/** 🔓 Canal destrancado automaticamente (print) */
export function payloadCanalDestrancado() {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(COR_SISTEMA)
        .setDescription(renderTextEmojis('🔓 Este canal foi **destrancado automaticamente** pelo sistema.')),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        chip('Mensagem do sistema', ButtonStyle.Secondary, null, true),
        new ButtonBuilder()
          .setCustomId(`zend:sys-chip-unlock:${Math.random().toString(36).slice(2, 9)}`)
          .setLabel('Canal destrancado')
          .setStyle(ButtonStyle.Success)
          .setEmoji(renderCustomEmojis('🔓'))
          .setDisabled(true),
      ),
    ],
  };
}

export async function enviarAvisoCanal(channel, payload) {
  if (!channel?.isTextBased?.()) return null;
  return channel.send(payload).catch(() => null);
}
