const {
  AuditLogEvent,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  MessageFlags,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");
const GuildConfig = require("../database/models/GuildConfig");

// ---------- CORES (mais fortes) ----------
const COLORS = {
  green: 0x00e62e,
  red: 0xff1a1a,
  yellow: 0xffc400,
  blue: 0x1e6bff,
  white: 0xffffff,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getConfig(guildId) {
  return GuildConfig.findOne({ guildId });
}

// ---------- HELPERS DE FORMATAÇÃO ----------
function formatDate(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  return `${parts.day}/${parts.month}/${parts.year} às ${parts.hour}:${parts.minute}:${parts.second}`;
}

function formatDuration(ms) {
  if (!ms || ms < 60000) return "<1m";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return [d && `${d}d`, (d || h) && `${h}h`, `${m}m`].filter(Boolean).join(" ");
}

function formatMinutes(ms) {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} minuto${min > 1 ? "s" : ""}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} hora${h > 1 ? "s" : ""}`;
  const d = Math.floor(h / 24);
  return `${d} dia${d > 1 ? "s" : ""}`;
}

function codeBlock(text, max = 900) {
  const clean = String(text ?? "").replace(/```/g, "'''").slice(0, max);
  return `\`\`\`\n${clean || "N/A"}\n\`\`\``;
}

function userLine(user) {
  return `<@${user.id}> — \`${user.username ?? user.tag}\` (\`${user.id}\`)`;
}

function avatarOf(user) {
  return user?.displayAvatarURL?.({ extension: "png", size: 256 }) ?? null;
}

function executorLine(entry, fallback = "Não identificado") {
  return entry?.executor
    ? `**Executado por:** <@${entry.executor.id}>`
    : `**Executado por:** ${fallback}`;
}

// ---------- CONSTRUTOR DO CONTAINER (Components V2) ----------
// lines  -> bloco principal (fica ao lado da miniatura)
// blocks -> blocos extras, cada um separado por uma linha divisória
function buildLog({ color, title, guild, thumbnail, lines = [], blocks = [] }) {
  const container = new ContainerBuilder().setAccentColor(color);

  const head = new TextDisplayBuilder().setContent(`## ${title} — ${guild.name}`);
  const body = new TextDisplayBuilder().setContent(lines.join("\n") || "-");

  if (thumbnail) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(head, body)
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail))
    );
  } else {
    container.addTextDisplayComponents(head, body);
  }

  for (const block of blocks) {
    if (!block) continue;
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(block));
  }

  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(formatDate()));

  return container;
}

async function sendLog(guild, container) {
  const config = await getConfig(guild.id);
  if (!config?.logsChannel) return;
  const channel = guild.channels.cache.get(config.logsChannel);
  if (!channel) return;
  channel
    .send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    })
    .catch((err) => console.error("[LOGS] Erro ao enviar log:", err.message));
}

// Busca no audit log quem executou a ação (best-effort)
async function getAuditEntry(guild, type, targetId, filter) {
  try {
    await sleep(1200); // o Discord demora um instante pra registrar no audit log
    const logs = await guild.fetchAuditLogs({ type, limit: 8 });
    return (
      logs.entries.find(
        (e) =>
          e.target?.id === targetId &&
          Date.now() - e.createdTimestamp < 15000 &&
          (!filter || filter(e))
      ) ?? null
    );
  } catch {
    return null; // sem permissão de "Ver registro de auditoria"
  }
}

function formatMessage(template, member) {
  if (!template) return null;
  return template
    .replaceAll("{user}", `<@${member.id}>`)
    .replaceAll("{usertag}", member.user?.tag ?? member.tag ?? "")
    .replaceAll("{server}", member.guild.name);
}

// ---------- PERMISSÕES (tradução) ----------
const PERM_PT = {
  AddReactions: "Adicionar reações",
  ViewChannel: "Ver canal",
  SendMessages: "Enviar mensagens",
  CreatePublicThreads: "Criar tópicos públicos",
  CreatePrivateThreads: "Criar tópicos privados",
  SendMessagesInThreads: "Enviar mensagens em tópicos",
  ManageChannels: "Gerenciar canal",
  ManageRoles: "Gerenciar permissões",
  ManageWebhooks: "Gerenciar webhooks",
  CreateInstantInvite: "Criar convite",
  EmbedLinks: "Inserir links",
  AttachFiles: "Anexar arquivos",
  ReadMessageHistory: "Ver histórico de mensagens",
  MentionEveryone: "Mencionar @everyone",
  UseExternalEmojis: "Usar emojis externos",
  UseExternalStickers: "Usar figurinhas externas",
  ManageMessages: "Gerenciar mensagens",
  ManageThreads: "Gerenciar tópicos",
  UseApplicationCommands: "Usar comandos de apps",
  Connect: "Conectar",
  Speak: "Falar",
  Stream: "Transmitir",
  UseVAD: "Usar detecção de voz",
  MuteMembers: "Silenciar membros",
  DeafenMembers: "Ensurdecer membros",
  MoveMembers: "Mover membros",
  PrioritySpeaker: "Voz prioritária",
  SendVoiceMessages: "Enviar mensagens de voz",
  SendPolls: "Criar enquetes",
};

function permState(overwrite, flag) {
  if (overwrite?.allow?.has(flag)) return "Permitido";
  if (overwrite?.deny?.has(flag)) return "Negado";
  return "Neutro";
}

function diffOverwrites(oldChannel, newChannel) {
  const oldCache = oldChannel.permissionOverwrites?.cache;
  const newCache = newChannel.permissionOverwrites?.cache;
  if (!oldCache || !newCache) return [];

  const ids = new Set([...oldCache.keys(), ...newCache.keys()]);
  const out = [];

  for (const id of ids) {
    const before = oldCache.get(id);
    const after = newCache.get(id);
    const changes = [];

    for (const [key, flag] of Object.entries(PermissionsBitField.Flags)) {
      const a = permState(before, flag);
      const b = permState(after, flag);
      if (a !== b) changes.push(`• \`${PERM_PT[key] ?? key}\`: ${a} → ${b}`);
    }

    if (changes.length) {
      const target = (after ?? before).type === 1 ? `<@${id}>` : `<@&${id}>`;
      out.push(`**Permissões de ${target} alteradas:**`, ...changes);
    }
  }

  return out.slice(0, 18); // evita estourar o limite de texto
}

const CHANNEL_TYPES = {
  [ChannelType.GuildText]: "Texto",
  [ChannelType.GuildVoice]: "Voz",
  [ChannelType.GuildCategory]: "Categoria",
  [ChannelType.GuildAnnouncement]: "Anúncios",
  [ChannelType.GuildStageVoice]: "Palco",
  [ChannelType.GuildForum]: "Fórum",
  [ChannelType.GuildMedia]: "Mídia",
};

function channelLines(channel, entry) {
  return [
    `**Canal:** <#${channel.id}> — \`${channel.name}\` (\`${channel.id}\`)`,
    `**Tipo:** ${CHANNEL_TYPES[channel.type] ?? "Outro"}`,
    `**Categoria:** ${channel.parent?.name ?? "Sem categoria"}`,
    executorLine(entry),
  ];
}

// ---------- REGISTRO DOS EVENTOS ----------
function registerLogEvents(client) {
  // ---------- PORTARIA: entrada ----------
  client.on("guildMemberAdd", async (member) => {
    const config = await getConfig(member.guild.id);

    if (config?.autoRoles?.length) {
      for (const roleId of config.autoRoles) {
        const role = member.guild.roles.cache.get(roleId);
        if (role) member.roles.add(role).catch(() => {});
      }
    }

    if (config?.welcomeChannel) {
      const channel = member.guild.channels.cache.get(config.welcomeChannel);
      if (channel) {
        const content =
          formatMessage(config.welcomeMessage, member) ?? `Bem-vindo(a), <@${member.id}>!`;
        channel.send({ content }).catch(() => {});
      }
    }

    const created = Math.floor(member.user.createdTimestamp / 1000);
    const days = (Date.now() - member.user.createdTimestamp) / 86400000;

    sendLog(
      member.guild,
      buildLog({
        color: COLORS.green,
        title: "Entrada",
        guild: member.guild,
        thumbnail: avatarOf(member.user),
        lines: [`**Usuário:** <@${member.id}> (${member.user.username})`],
        blocks: [
          [
            `**ID:** \`${member.id}\``,
            `**Tag:** \`${member.user.username}\``,
            `**Conta criada em:** <t:${created}:F> (\`${days.toFixed(1)} dia(s) atrás\`)`,
            `**Membros no servidor:** \`${member.guild.memberCount}\``,
          ].join("\n"),
        ],
      })
    );
  });

  // ---------- PORTARIA: saída / expulsão ----------
  client.on("guildMemberRemove", async (member) => {
    const config = await getConfig(member.guild.id);
    if (config?.leaveChannel) {
      const channel = member.guild.channels.cache.get(config.leaveChannel);
      if (channel) {
        const content =
          formatMessage(config.leaveMessage, member) ?? `<@${member.id}> saiu do servidor.`;
        channel.send({ content }).catch(() => {});
      }
    }

    const kick = await getAuditEntry(member.guild, AuditLogEvent.MemberKick, member.id);
    const roles = member.roles?.cache
      ?.filter((r) => r.id !== member.guild.id)
      .map((r) => `<@&${r.id}>`);

    const lines = [`**Usuário:** <@${member.id}> (${member.user.username})`];
    if (kick) lines.push(executorLine(kick));

    const info = [
      `**ID:** \`${member.id}\``,
      `**Tag:** \`${member.user.username}\``,
    ];
    if (member.joinedTimestamp) {
      info.push(`**Estava no servidor há:** \`${formatDuration(Date.now() - member.joinedTimestamp)}\``);
    }
    info.push(`**Cargos que possuía:** ${roles?.length ? roles.join(" ") : "`Nenhum`"}`);
    info.push(`**Membros no servidor:** \`${member.guild.memberCount}\``);

    const blocks = [info.join("\n")];
    if (kick) blocks.unshift(`**Motivo:** ${kick.reason ?? "Não informado"}`);

    sendLog(
      member.guild,
      buildLog({
        color: COLORS.red,
        title: kick ? "Expulsão" : "Saída",
        guild: member.guild,
        thumbnail: avatarOf(member.user),
        lines,
        blocks,
      })
    );
  });

  // ---------- BAN / UNBAN ----------
  client.on("guildBanAdd", async (ban) => {
    const entry = await getAuditEntry(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
    sendLog(
      ban.guild,
      buildLog({
        color: COLORS.red,
        title: "Banimento",
        guild: ban.guild,
        thumbnail: avatarOf(ban.user),
        lines: [`**Usuário:** ${userLine(ban.user)}`, executorLine(entry)],
        blocks: [`**Motivo:** ${entry?.reason ?? ban.reason ?? "Não informado"}`],
      })
    );
  });

  client.on("guildBanRemove", async (ban) => {
    const entry = await getAuditEntry(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
    sendLog(
      ban.guild,
      buildLog({
        color: COLORS.green,
        title: "Desbanimento",
        guild: ban.guild,
        thumbnail: avatarOf(ban.user),
        lines: [`**Usuário:** ${userLine(ban.user)}`, executorLine(entry)],
      })
    );
  });

  // ---------- MUTE (timeout) / CARGOS ----------
  client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const guild = newMember.guild;
    const user = newMember.user;

    // Timeout
    const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
    const newTimeout = newMember.communicationDisabledUntilTimestamp;
    if (oldTimeout !== newTimeout) {
      const muted = Boolean(newTimeout && newTimeout > Date.now());
      const entry = await getAuditEntry(guild, AuditLogEvent.MemberUpdate, newMember.id, (e) =>
        e.changes?.some((c) => c.key === "communication_disabled_until")
      );

      const blocks = [];
      if (muted) {
        blocks.push(`**Motivo:** ${entry?.reason ?? "Não informado"}`);
        blocks.push(`**Duração:** \`${formatMinutes(newTimeout - Date.now())}\``);
      }

      sendLog(
        guild,
        buildLog({
          color: muted ? COLORS.red : COLORS.green,
          title: muted ? "Mute" : "Unmute",
          guild,
          thumbnail: avatarOf(user),
          lines: [`**Usuário:** ${userLine(user)}`, executorLine(entry)],
          blocks,
        })
      );
    }

    // Cargos (ignora se o membro antigo veio parcial, pra não gerar log falso)
    if (oldMember.partial) return;

    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;
    const added = newRoles.filter((r) => !oldRoles.has(r.id));
    const removed = oldRoles.filter((r) => !newRoles.has(r.id));
    if (!added.size && !removed.size) return;

    const entry = await getAuditEntry(guild, AuditLogEvent.MemberRoleUpdate, newMember.id);

    if (added.size) {
      sendLog(
        guild,
        buildLog({
          color: COLORS.green,
          title: "Cargo adicionado",
          guild,
          thumbnail: avatarOf(user),
          lines: [`**Usuário:** ${userLine(user)}`, executorLine(entry)],
          blocks: [`**Cargo:** ${added.map((r) => `<@&${r.id}>`).join(" ")}`],
        })
      );
    }
    if (removed.size) {
      sendLog(
        guild,
        buildLog({
          color: COLORS.red,
          title: "Cargo removido",
          guild,
          thumbnail: avatarOf(user),
          lines: [`**Usuário:** ${userLine(user)}`, executorLine(entry)],
          blocks: [`**Cargo:** ${removed.map((r) => `<@&${r.id}>`).join(" ")}`],
        })
      );
    }
  });

  // ---------- CANAIS ----------
  client.on("channelCreate", async (channel) => {
    if (!channel.guild) return;
    const entry = await getAuditEntry(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
    sendLog(
      channel.guild,
      buildLog({
        color: COLORS.green,
        title: "Canal criado",
        guild: channel.guild,
        thumbnail: channel.guild.iconURL({ extension: "png", size: 256 }),
        lines: channelLines(channel, entry),
      })
    );
  });

  client.on("channelDelete", async (channel) => {
    if (!channel.guild) return;
    const entry = await getAuditEntry(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
    sendLog(
      channel.guild,
      buildLog({
        color: COLORS.red,
        title: "Canal apagado",
        guild: channel.guild,
        thumbnail: channel.guild.iconURL({ extension: "png", size: 256 }),
        lines: [
          `**Canal:** \`${channel.name}\` (\`${channel.id}\`)`,
          `**Tipo:** ${CHANNEL_TYPES[channel.type] ?? "Outro"}`,
          `**Categoria:** ${channel.parent?.name ?? "Sem categoria"}`,
          executorLine(entry),
        ],
      })
    );
  });

  client.on("channelUpdate", async (oldChannel, newChannel) => {
    if (!newChannel.guild) return;

    const permLines = diffOverwrites(oldChannel, newChannel);
    const renamed = oldChannel.name !== newChannel.name;
    if (!renamed && !permLines.length) return; // ignora updates irrelevantes

    const entry = await getAuditEntry(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
    const blocks = [];
    if (renamed) blocks.push(`**Nome:** \`${oldChannel.name}\` → \`${newChannel.name}\``);
    if (permLines.length) blocks.push(permLines.join("\n"));

    sendLog(
      newChannel.guild,
      buildLog({
        color: COLORS.white,
        title: "Canal editado",
        guild: newChannel.guild,
        thumbnail: newChannel.guild.iconURL({ extension: "png", size: 256 }),
        lines: channelLines(newChannel, entry),
        blocks,
      })
    );
  });

  // ---------- FLUXO DE CALL ----------
  const mentionList = (channel) => {
    const list = channel?.members?.map((m) => `<@${m.id}>`) ?? [];
    return { count: list.length, text: list.length ? list.join(" ") : "`ninguém`" };
  };

  client.on("voiceStateUpdate", (oldState, newState) => {
    const guild = newState.guild;
    const member = newState.member;
    if (!member) return;
    const user = member.user;

    if (!oldState.channelId && newState.channelId) {
      const ch = newState.channel;
      const m = mentionList(ch);
      sendLog(
        guild,
        buildLog({
          color: COLORS.green,
          title: "Voz — Entrou",
          guild,
          thumbnail: avatarOf(user),
          lines: [`**Usuário:** ${userLine(user)}`],
          blocks: [
            `**Canal:** <#${ch.id}> — \`${ch.name}\` (\`${ch.id}\`)\n**Na call (${m.count}):** ${m.text}`,
          ],
        })
      );
    } else if (oldState.channelId && !newState.channelId) {
      const ch = oldState.channel;
      const m = mentionList(ch);
      sendLog(
        guild,
        buildLog({
          color: COLORS.red,
          title: "Voz — Saiu",
          guild,
          thumbnail: avatarOf(user),
          lines: [`**Usuário:** ${userLine(user)}`],
          blocks: [
            `**Canal:** <#${ch.id}> — \`${ch.name}\` (\`${ch.id}\`)\n**Restam (${m.count}):** ${m.text}`,
          ],
        })
      );
    } else if (oldState.channelId !== newState.channelId) {
      sendLog(
        guild,
        buildLog({
          color: COLORS.yellow,
          title: "Voz — Trocou de call",
          guild,
          thumbnail: avatarOf(user),
          lines: [`**Usuário:** ${userLine(user)}`],
          blocks: [
            `**De:** <#${oldState.channelId}>\n**Para:** <#${newState.channelId}>`,
          ],
        })
      );
    }
  });

  // ---------- MENSAGENS ----------
  client.on("messageDelete", async (message) => {
    if (!message.guild || message.author?.bot) return;

    const author = message.author;
    const entry = author
      ? await getAuditEntry(
          message.guild,
          AuditLogEvent.MessageDelete,
          author.id,
          (e) => e.extra?.channel?.id === message.channelId
        )
      : null;

    const executor = entry?.executor
      ? `<@${entry.executor.id}>`
      : author
        ? "o próprio autor"
        : "Não identificado";

    sendLog(
      message.guild,
      buildLog({
        color: COLORS.red,
        title: "Mensagem apagada",
        guild: message.guild,
        thumbnail: author ? avatarOf(author) : message.guild.iconURL({ extension: "png", size: 256 }),
        lines: [
          `**Autor:** ${author ? userLine(author) : "Desconhecido"}`,
          `**Canal:** <#${message.channelId}> — \`${message.channel?.name ?? "?"}\` (\`${message.channelId}\`)`,
          `**Executor:** ${executor}`,
          `**Mensagem ID:** \`${message.id}\``,
        ],
        blocks: [`**Conteúdo**\n${codeBlock(message.content)}`],
      })
    );
  });

  client.on("messageUpdate", (oldMessage, newMessage) => {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    const author = newMessage.author;

    sendLog(
      newMessage.guild,
      buildLog({
        color: COLORS.yellow,
        title: "Mensagem editada",
        guild: newMessage.guild,
        thumbnail: author ? avatarOf(author) : newMessage.guild.iconURL({ extension: "png", size: 256 }),
        lines: [
          `**Autor:** ${author ? userLine(author) : "Desconhecido"}`,
          `**Canal:** <#${newMessage.channelId}> — \`${newMessage.channel?.name ?? "?"}\``,
          `**Mensagem:** [ir para a mensagem](${newMessage.url})`,
        ],
        blocks: [
          `**Antes**\n${codeBlock(oldMessage.content, 800)}`,
          `**Depois**\n${codeBlock(newMessage.content, 800)}`,
        ],
      })
    );
  });
}

module.exports = { registerLogEvents };
