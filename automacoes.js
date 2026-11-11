const convitesPorServidor = new Map();

function mapaDeUsos(convites) {
  return new Map([...convites.values()].map((invite) => [invite.code, Number(invite.uses || 0)]));
}

async function carregarConvites(guild) {
  const invites = await guild.invites.fetch().catch(() => null);
  if (invites) convitesPorServidor.set(guild.id, mapaDeUsos(invites));
}

function pareceFeedbackNegativo(content) {
  return /\b(ruim|péssim|pessim|horrível|horrivel|golpe|scam|demora|não gostei|nao gostei|problema)\b/i.test(content);
}

export function registrarEventosAutomacoes(client, { guildState, saveState, sendConfiguredLog, embed }) {
  client.once('clientReady', async () => {
    for (const guild of client.guilds.cache.values()) await carregarConvites(guild);
  });

  client.on('inviteCreate', async (invite) => carregarConvites(invite.guild));
  client.on('inviteDelete', async (invite) => carregarConvites(invite.guild));

  client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;
    const gs = guildState(message.guild.id);
    const config = gs.automations.feedback;
    const feedbackChannel = config.channel || gs.channels.feedback;
    if (!config.enabled || feedbackChannel !== message.channelId) return;

    if (config.reactionEmoji) await message.react(config.reactionEmoji).catch(() => null);
    if (pareceFeedbackNegativo(message.content) && gs.channels.system) {
      await sendConfiguredLog(message.guild, gs.channels.system, {
        embeds: [embed(
          'Feedback negativo detectado',
          `**Usuário:** ${message.author}\n**Canal:** ${message.channel}\n**Mensagem:**\n${message.content.slice(0, 1500)}\n\n[Ir para a mensagem](${message.url})`,
          message.guild,
          'Monitor de feedbacks',
        ).setColor(0xe60000)],
      });
    }
  });

  client.on('guildMemberAdd', async (member) => {
    const gs = guildState(member.guild.id);
    const config = gs.automations.invite;
    if (!config.enabled) return;

    const atuais = await member.guild.invites.fetch().catch(() => null);
    if (!atuais) return;
    const anteriores = convitesPorServidor.get(member.guild.id) || new Map();
    const usado = [...atuais.values()].find((invite) => Number(invite.uses || 0) > Number(anteriores.get(invite.code) || 0));
    convitesPorServidor.set(member.guild.id, mapaDeUsos(atuais));
    if (!usado?.inviterId) return;

    const accountDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86_400_000);
    const fake = accountDays < Number(config.minimumAccountDays || 7);
    const registro = gs.invitations[usado.inviterId] ||= { count: 0, fake: 0, leaves: 0, invitedUsers: [] };
    registro.count += 1;
    if (fake) registro.fake += 1;
    registro.invitedUsers.push({ userId: member.id, joinedAt: Date.now(), fake });

    for (const reward of config.rewards || []) {
      if (Number(registro.count) < Number(reward.invites) || !reward.roleId) continue;
      const inviter = await member.guild.members.fetch(usado.inviterId).catch(() => null);
      if (inviter && !inviter.roles.cache.has(reward.roleId)) await inviter.roles.add(reward.roleId, 'Recompensa de convites Zend').catch(() => null);
    }

    if (config.logChannel) {
      const validos = Math.max(0, Number(registro.count) - Number(registro.fake));
      await sendConfiguredLog(member.guild, config.logChannel, {
        embeds: [embed(
          'Novo membro via invite',
          [
            `${member} entrou no servidor!`,
            '',
            `**Convidado por:** <@${usado.inviterId}>`,
            `**Convites de ${usado.inviter?.username || usado.inviterId}:**`,
            `├ Total convidado: \`${registro.count}\` pessoa(s)`,
            `├ Ativos: \`${Math.max(0, registro.count - registro.leaves)}\` convite(s)`,
            `├ Válidos: \`${validos}\``,
            `├ Fakes: \`${registro.fake}\``,
            `└ Saíram: \`${registro.leaves}\` pessoa(s)`,
            '',
            fake ? `⚠️ **Conta fake detectada** (menos de \`${config.minimumAccountDays || 7}\` dias)` : '✅ Conta válida',
          ].join('\n'),
          member.guild,
          'Invite Tracker',
        ).setColor(fake ? 0xe60000 : 0x22c55e)],
      });
    }

    await saveState();
  });

  client.on('guildMemberRemove', async (member) => {
    const gs = guildState(member.guild.id);
    for (const registro of Object.values(gs.invitations || {})) {
      const convidado = registro.invitedUsers?.find((item) => item.userId === member.id && !item.leftAt);
      if (!convidado) continue;
      convidado.leftAt = Date.now();
      registro.leaves = Number(registro.leaves || 0) + 1;
      await saveState();
      break;
    }
  });
}
