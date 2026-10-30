const { ChannelType, MessageFlags, EmbedBuilder } = require("discord.js");
const GuildConfig = require("../database/models/GuildConfig");
const { STAFF_ROLE_IDS, TICKET_OPTIONS } = require("../utils/ticketConfig");
const {
  buildTicketPanel,
  buildTicketContainer,
  buildClaimedContainer,
  buildTicketCreatedEphemeral,
} = require("../ui/ticket");

// Apenas quem tem um dos cargos da equipe
function isStaff(member) {
  return member.roles.cache.hasAny(...STAFF_ROLE_IDS);
}

// Aviso de falta de permissão: efêmera dentro de uma embed tradicional
function replyNoPermission(interaction, action) {
  const embed = new EmbedBuilder()
    .setColor(0xff1a1a)
    .setDescription(`<@${interaction.user.id}> Você não tem permissão para ${action} tickets.`);

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// Select menu do painel: cria o tópico privado
async function handleTicketSelect(interaction) {
  const optionKey = interaction.values[0];
  if (!TICKET_OPTIONS[optionKey]) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Reseta o select do painel (ele não fica marcado na opção escolhida)
  interaction.message
    .edit({ components: buildTicketPanel(), flags: MessageFlags.IsComponentsV2 })
    .catch(() => {});

  const user = interaction.user;

  try {
    // Número do ticket (contador por servidor)
    const config = await GuildConfig.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { $inc: { ticketCounter: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const thread = await interaction.channel.threads.create({
      name: `📌・${user.username}・N°${config.ticketCounter}`.slice(0, 100),
      type: ChannelType.PrivateThread,
      invitable: false,
      autoArchiveDuration: 10080,
      reason: `Ticket aberto por ${user.tag}`,
    });

    await thread.members.add(user.id);

    // Fileira de menção (fora do container). Marcar os cargos adiciona a equipe no tópico privado.
    const mentions = [`<@${user.id}>`, ...STAFF_ROLE_IDS.map((id) => `<@&${id}>`)].join(", ");
    await thread.send({
      content: mentions,
      allowedMentions: { users: [user.id], roles: STAFF_ROLE_IDS },
    });

    await thread.send({
      components: [buildTicketContainer({ author: user, optionKey })],
      flags: MessageFlags.IsComponentsV2,
    });

    const url = `https://discord.com/channels/${interaction.guild.id}/${thread.id}`;
    return interaction.editReply({
      components: buildTicketCreatedEphemeral(url),
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (err) {
    console.error("[TICKET] Erro ao criar ticket:", err);
    return interaction.editReply({
      content:
        "Não consegui abrir o ticket. Verifique se eu tenho as permissões de criar tópicos privados, enviar mensagens em tópicos e gerenciar tópicos neste canal.",
    });
  }
}

// Botões Assumir / Finalizar dentro do tópico
async function handleTicketButton(interaction) {
  const { customId } = interaction;

  const isClaim = customId.startsWith("ticket_claim:");

  if (!isStaff(interaction.member)) {
    return replyNoPermission(interaction, isClaim ? "assumir" : "finalizar");
  }

  if (isClaim) {
    const [, authorId, optionKey] = customId.split(":");
    const author = await interaction.client.users.fetch(authorId);

    // Atualiza o painel do ticket (botão vira "Assumido" cinza e desativado)
    await interaction.update({
      components: [buildTicketContainer({ author, optionKey, claimedBy: interaction.user })],
    });

    // 1) menção do autor, sozinha
    await interaction.channel.send({
      content: `<@${authorId}>`,
      allowedMentions: { users: [authorId] },
    });

    // 2) container sozinho, sem pingar o staff
    await interaction.channel.send({
      components: [
        buildClaimedContainer(interaction.user.id, Math.floor(Date.now() / 1000)),
      ],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
    return;
  }

  if (customId === "ticket_close") {
    await interaction.deferUpdate().catch(() => {});
    await interaction.channel.delete("Ticket finalizado").catch((err) => {
      console.error("[TICKET] Erro ao excluir tópico:", err);
    });
  }
}

module.exports = { handleTicketSelect, handleTicketButton };
