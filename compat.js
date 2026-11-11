import * as DiscordNamespace from 'discord.js';

const Discord = DiscordNamespace.default || DiscordNamespace;

class CompatBuilder {
  constructor(data = {}) {
    this.data = data;
    return new Proxy(this, {
      get: (target, property) => {
        if (property in target) return target[property];
        return (...args) => {
          target.data[property] = args.length > 1 ? args : args[0];
          return target;
        };
      },
    });
  }

  toJSON() {
    return this.data;
  }
}

const pick = (name, ...aliases) => {
  for (const key of [name, ...aliases]) {
    if (Discord?.[key] !== undefined) return Discord[key];
  }
  return undefined;
};

export const ActionRowBuilder = pick('ActionRowBuilder', 'MessageActionRow') || CompatBuilder;
export const AttachmentBuilder = pick('AttachmentBuilder', 'MessageAttachment') || CompatBuilder;
export const ButtonBuilder = pick('ButtonBuilder', 'MessageButton') || CompatBuilder;
export const EmbedBuilder = pick('EmbedBuilder', 'MessageEmbed') || CompatBuilder;
export const ModalBuilder = pick('ModalBuilder', 'Modal') || CompatBuilder;
export const TextInputBuilder = pick('TextInputBuilder', 'TextInputComponent') || CompatBuilder;
export const StringSelectMenuBuilder = pick('StringSelectMenuBuilder', 'MessageSelectMenu') || CompatBuilder;
export const ChannelSelectMenuBuilder = pick('ChannelSelectMenuBuilder', 'MessageSelectMenu') || CompatBuilder;
export const RoleSelectMenuBuilder = pick('RoleSelectMenuBuilder', 'MessageSelectMenu') || CompatBuilder;
export const ContainerBuilder = pick('ContainerBuilder') || CompatBuilder;
export const MediaGalleryBuilder = pick('MediaGalleryBuilder') || CompatBuilder;
export const MediaGalleryItemBuilder = pick('MediaGalleryItemBuilder') || CompatBuilder;
export const SeparatorBuilder = pick('SeparatorBuilder') || CompatBuilder;
export const TextDisplayBuilder = pick('TextDisplayBuilder') || CompatBuilder;

export const Client = pick('Client') || CompatBuilder;
export const REST = pick('REST') || CompatBuilder;
export const SlashCommandBuilder = pick('SlashCommandBuilder') || CompatBuilder;
export const CommandInteraction = pick('CommandInteraction') || CompatBuilder;
export const MessageComponentInteraction = pick('MessageComponentInteraction') || CompatBuilder;
export const ModalSubmitInteraction = pick('ModalSubmitInteraction') || CompatBuilder;

export const ButtonStyle = pick('ButtonStyle') || {
  Primary: 1,
  Secondary: 2,
  Success: 3,
  Danger: 4,
  Link: 5,
};

export const TextInputStyle = pick('TextInputStyle') || { Short: 1, Paragraph: 2 };
export const MessageFlags = pick('MessageFlags') || { Ephemeral: 64, SuppressEmbeds: 4 };
export const PermissionFlagsBits = pick('PermissionFlagsBits') || pick('PermissionsBitField')?.Flags || {
  CreateInstantInvite: 1n,
  KickMembers: 2n,
  BanMembers: 4n,
  Administrator: 8n,
  ManageChannels: 16n,
  ManageGuild: 32n,
  ViewChannel: 1024n,
  SendMessages: 2048n,
  ManageMessages: 8192n,
  ManageRoles: 268435456n,
  ManageGuildExpressions: 8589934592n,
  ManageEmojisAndStickers: 1073741824n,
};

export const GatewayIntentBits = pick('GatewayIntentBits') || pick('Intents')?.FLAGS || {
  Guilds: 1,
  GuildMembers: 2,
  GuildModeration: 4,
  GuildInvites: 64,
  GuildMessages: 512,
  MessageContent: 32768,
};
export const AuditLogEvent = pick('AuditLogEvent') || {
  ChannelCreate: 10,
  ChannelDelete: 12,
  RoleCreate: 30,
  RoleDelete: 32,
};
export const Partials = pick('Partials') || {};
export const ActivityType = pick('ActivityType') || { Playing: 0, Streaming: 1, Listening: 2, Watching: 3, Competing: 5 };
export const ChannelType = pick('ChannelType') || {
  GuildText: 0,
  GuildVoice: 2,
  GuildCategory: 4,
  GuildAnnouncement: 5,
  GuildForum: 15,
};

export const Routes = pick('Routes') || {
  applicationCommands: (clientId) => `/applications/${clientId}/commands`,
  applicationGuildCommands: (clientId, guildId) => `/applications/${clientId}/guilds/${guildId}/commands`,
};
