const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const GuildConfig = require("../database/models/GuildConfig");

async function getConfig(guildId) {
  return GuildConfig.findOne({ guildId });
}

async function sendLog(guild, embed) {
  const config = await getConfig(guild.id);
  if (!config?.logsChannel) return;
  const channel = guild.channels.cache.get(config.logsChannel);
  if (!channel) return;
  channel.send({ embeds: [embed] }).catch(() => {});
}

function formatMessage(template, member) {
  if (!template) return null;
  return template
    .replaceAll("{user}", `<@${member.id}>`)
    .replaceAll("{usertag}", member.user?.tag ?? member.tag ?? "")
    .replaceAll("{server}", member.guild.name);
}

function registerLogEvents(client) {
  // ---------- PORTARIA: entrada ----------
  client.on("guildMemberAdd", async (member) => {
    const config = await getConfig(member.guild.id);
    if (!config) return;

    // Auto-roles
    if (config.autoRoles?.length) {
      for (const roleId of config.autoRoles) {
        const role = member.guild.roles.cache.get(roleId);
        if (role) member.roles.add(role).catch(() => {});
      }
    }

    // Mensagem de boas-vindas
    if (config.welcomeChannel) {
      const channel = member.guild.channels.cache.get(config.welcomeChannel);
      if (channel) {
        const content = formatMessage(config.welcomeMessage, member) ?? `Bem-vindo(a), <@${member.id}>!`;
        channel.send({ content }).catch(() => {});
      }
    }

    sendLog(
      member.guild,
      new EmbedBuilder()
        .setTitle("Entrada de membro")
        .setDescription(`<@${member.id}> entrou no servidor.`)
        .setColor(0x57f287)
        .setTimestamp()
    );
  });

  // ---------- PORTARIA: saída ----------
  client.on("guildMemberRemove", async (member) => {
    const config = await getConfig(member.guild.id);
    if (config?.leaveChannel) {
      const channel = member.guild.channels.cache.get(config.leaveChannel);
      if (channel) {
        const content = formatMessage(config.leaveMessage, member) ?? `<@${member.id}> saiu do servidor.`;
        channel.send({ content }).catch(() => {});
      }
    }

    // Tenta descobrir se foi kick (best-effort via audit log)
    let isKick = false;
    try {
      const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 3 });
      const entry = logs.entries.find(
        (e) => e.target?.id === member.id && Date.now() - e.createdTimestamp < 5000
      );
      isKick = Boolean(entry);
    } catch {
      /* sem permissão de ver audit log */
    }

    sendLog(
      member.guild,
      new EmbedBuilder()
        .setTitle(isKick ? "Expulsão (kick)" : "Saída de membro")
        .setDescription(`<@${member.id}> ${isKick ? "foi expulso do servidor." : "saiu do servidor."}`)
        .setColor(0xed4245)
        .setTimestamp()
    );
  });

  // ---------- BAN / UNBAN ----------
  client.on("guildBanAdd", (ban) => {
    sendLog(
      ban.guild,
      new EmbedBuilder()
        .setTitle("Banimento")
        .setDescription(`<@${ban.user.id}> foi banido.`)
        .setColor(0xed4245)
        .setTimestamp()
    );
  });

  client.on("guildBanRemove", (ban) => {
    sendLog(
      ban.guild,
      new EmbedBuilder()
        .setTitle("Desbanimento")
        .setDescription(`<@${ban.user.id}> foi desbanido.`)
        .setColor(0x57f287)
        .setTimestamp()
    );
  });

  // ---------- CARGOS / MUTE (timeout) ----------
  client.on("guildMemberUpdate", (oldMember, newMember) => {
    // Timeout (mute)
    const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
    const newTimeout = newMember.communicationDisabledUntilTimestamp;
    if (oldTimeout !== newTimeout) {
      sendLog(
        newMember.guild,
        new EmbedBuilder()
          .setTitle(newTimeout ? "Membro silenciado (mute)" : "Silenciamento removido (unmute)")
          .setDescription(`<@${newMember.id}>`)
          .setColor(0xfee75c)
          .setTimestamp()
      );
    }

    // Cargos adicionados/removidos
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;

    const added = newRoles.filter((r) => !oldRoles.has(r.id));
    const removed = oldRoles.filter((r) => !newRoles.has(r.id));

    if (added.size) {
      sendLog(
        newMember.guild,
        new EmbedBuilder()
          .setTitle("Cargo adicionado")
          .setDescription(`<@${newMember.id}> recebeu: ${added.map((r) => r.name).join(", ")}`)
          .setColor(0x5865f2)
          .setTimestamp()
      );
    }
    if (removed.size) {
      sendLog(
        newMember.guild,
        new EmbedBuilder()
          .setTitle("Cargo removido")
          .setDescription(`<@${newMember.id}> perdeu: ${removed.map((r) => r.name).join(", ")}`)
          .setColor(0x5865f2)
          .setTimestamp()
      );
    }
  });

  // ---------- CANAIS ----------
  client.on("channelCreate", (channel) => {
    if (!channel.guild) return;
    sendLog(
      channel.guild,
      new EmbedBuilder()
        .setTitle("Canal criado")
        .setDescription(`${channel.name} (${channel.id})`)
        .setColor(0x57f287)
        .setTimestamp()
    );
  });

  client.on("channelDelete", (channel) => {
    if (!channel.guild) return;
    sendLog(
      channel.guild,
      new EmbedBuilder()
        .setTitle("Canal excluído")
        .setDescription(`${channel.name} (${channel.id})`)
        .setColor(0xed4245)
        .setTimestamp()
    );
  });

  client.on("channelUpdate", (oldChannel, newChannel) => {
    if (!newChannel.guild) return;
    if (oldChannel.name === newChannel.name) return; // evita spam de updates irrelevantes
    sendLog(
      newChannel.guild,
      new EmbedBuilder()
        .setTitle("Canal editado")
        .setDescription(`${oldChannel.name} → ${newChannel.name}`)
        .setColor(0xfee75c)
        .setTimestamp()
    );
  });

  // ---------- FLUXO DE CALL ----------
  client.on("voiceStateUpdate", (oldState, newState) => {
    const guild = newState.guild;
    const member = newState.member;

    if (!oldState.channelId && newState.channelId) {
      sendLog(
        guild,
        new EmbedBuilder()
          .setTitle("Entrou em uma call")
          .setDescription(`<@${member.id}> entrou em <#${newState.channelId}>`)
          .setColor(0x57f287)
          .setTimestamp()
      );
    } else if (oldState.channelId && !newState.channelId) {
      sendLog(
        guild,
        new EmbedBuilder()
          .setTitle("Saiu de uma call")
          .setDescription(`<@${member.id}> saiu de <#${oldState.channelId}>`)
          .setColor(0xed4245)
          .setTimestamp()
      );
    } else if (oldState.channelId !== newState.channelId) {
      sendLog(
        guild,
        new EmbedBuilder()
          .setTitle("Trocou de call")
          .setDescription(`<@${member.id}> foi de <#${oldState.channelId}> para <#${newState.channelId}>`)
          .setColor(0xfee75c)
          .setTimestamp()
      );
    }
  });

  // ---------- MENSAGENS ----------
  client.on("messageDelete", (message) => {
    if (!message.guild || message.author?.bot) return;
    sendLog(
      message.guild,
      new EmbedBuilder()
        .setTitle("Mensagem excluída")
        .setDescription(`Autor: <@${message.author?.id}>\nCanal: <#${message.channel.id}>`)
        .addFields({ name: "Conteúdo", value: message.content?.slice(0, 1024) || "N/A" })
        .setColor(0xed4245)
        .setTimestamp()
    );
  });

  client.on("messageUpdate", (oldMessage, newMessage) => {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    sendLog(
      newMessage.guild,
      new EmbedBuilder()
        .setTitle("Mensagem editada")
        .setDescription(`Autor: <@${newMessage.author?.id}>\nCanal: <#${newMessage.channel.id}>`)
        .addFields(
          { name: "Antes", value: oldMessage.content?.slice(0, 1024) || "N/A" },
          { name: "Depois", value: newMessage.content?.slice(0, 1024) || "N/A" }
        )
        .setColor(0xfee75c)
        .setTimestamp()
    );
  });
}

module.exports = { registerLogEvents };
