const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const { PANEL_IMAGE, TICKET_OPTIONS } = require("../utils/ticketConfig");

// Painel enviado pelo n!ticket: imagem + select menu
function buildTicketPanel() {
  const select = new StringSelectMenuBuilder()
    .setCustomId("ticket_select")
    .setPlaceholder("Selecione uma opção")
    .addOptions(
      Object.entries(TICKET_OPTIONS).map(([value, opt]) => ({
        label: opt.label,
        description: opt.description,
        value,
      }))
    );

  return [
    new ContainerBuilder()
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(PANEL_IMAGE))
      )
      .addActionRowComponents(new ActionRowBuilder().addComponents(select)),
  ];
}

// Container dentro do tópico do ticket
function buildTicketContainer({ author, optionKey, claimedBy = null }) {
  const opt = TICKET_OPTIONS[optionKey];

  const section = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## Ticket - ${author.username}`),
      new TextDisplayBuilder().setContent(
        `**Assumido por:** \`${claimedBy ? claimedBy.username : "Ninguém"}\``
      ),
      new TextDisplayBuilder().setContent(
        `**Opção selecionada:**\n\`\`\`\n${opt.label}\n\`\`\``
      )
    )
    .setThumbnailAccessory(
      new ThumbnailBuilder().setURL(author.displayAvatarURL({ extension: "png", size: 256 }))
    );

  const claimButton = new ButtonBuilder()
    .setCustomId(`ticket_claim:${author.id}:${optionKey}`)
    .setLabel(claimedBy ? "Assumido" : "Assumir")
    .setStyle(claimedBy ? ButtonStyle.Secondary : ButtonStyle.Success)
    .setDisabled(Boolean(claimedBy));

  const closeButton = new ButtonBuilder()
    .setCustomId("ticket_close")
    .setLabel("Finalizar")
    .setStyle(ButtonStyle.Danger);

  return new ContainerBuilder()
    .addSectionComponents(section)
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${opt.title}\n Por favor, aguarde as instruções do staff responsável.`
      )
    )
    .addActionRowComponents(new ActionRowBuilder().addComponents(claimButton, closeButton));
}

// Mensagem enviada quando um staff assume o ticket
function buildClaimedContainer(staffId, timestamp) {
  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### <@${staffId}> **Assumiu** este ticket e irá lhe atender.\n-# <t:${timestamp}:t>`
    )
  );
}

// Efêmera de sucesso com botão para o ticket
function buildTicketCreatedEphemeral(url) {
  const link = new ButtonBuilder()
    .setStyle(ButtonStyle.Link)
    .setLabel("Ir para o ticket")
    .setURL(url);

  return [
    new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("### Atendimento indicado com sucesso.")
      )
      .addActionRowComponents(new ActionRowBuilder().addComponents(link)),
  ];
}

module.exports = {
  buildTicketPanel,
  buildTicketContainer,
  buildClaimedContainer,
  buildTicketCreatedEphemeral,
};
