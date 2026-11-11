import * as Discord from './compat.js';

const nativeFlags = Discord.PermissionFlagsBits
  || Discord.PermissionsBitField?.Flags
  || Discord.Permissions?.FLAGS
  || {};

const fallbackFlags = {
  Administrator: 8n,
  ViewChannel: 1024n,
  ManageChannels: 16n,
  ManageGuild: 32n,
  ManageMessages: 8192n,
  ManageRoles: 268435456n,
  ManageEmojisAndStickers: 1073741824n,
  ManageGuildExpressions: 8589934592n,
};

export const PermissionFlagsBits = Object.freeze({
  ...fallbackFlags,
  ...nativeFlags,
});
