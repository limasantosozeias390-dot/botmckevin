const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { buildBackButton } = require("./backButton");

function buildAparenciaPanel() {
  const header = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent("## Aparência e prefixo"),
    new TextDisplayBuilder().setContent("-# Configurações de aparência do bot.")
  );

  const nomeSection = new ContainerBuilder().addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("**Nome do bot**"),
        new TextDisplayBuilder().setContent(
          "-# Defina o **nome** do bot clicando no botão ao lado."
        )
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId("btn_nome")
          .setLabel("Definir")
          .setStyle(ButtonStyle.Secondary)
      )
  );

  const avatarSection = new ContainerBuilder().addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("**Avatar do bot**"),
        new TextDisplayBuilder().setContent(
          "-# Defina o **avatar** do bot clicando no botão ao lado."
        )
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId("btn_avatar")
          .setLabel("Definir")
          .setStyle(ButtonStyle.Secondary)
      )
  );

  const bannerSection = new ContainerBuilder().addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("**Banner do bot**"),
        new TextDisplayBuilder().setContent(
          "-# Defina o **banner** do bot clicando no botão ao lado."
        )
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId("btn_banner")
          .setLabel("Definir")
          .setStyle(ButtonStyle.Secondary)
      )
  );

  const prefixoSection = new ContainerBuilder().addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("**Prefixo do bot**"),
        new TextDisplayBuilder().setContent(
          "Defina o **prefixo** do bot clicando no botão ao lado."
        )
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId("btn_prefixo")
          .setLabel("Definir")
          .setStyle(ButtonStyle.Secondary)
      )
  );

  const backRow = buildBackButton("back_main");

  return [header, nomeSection, avatarSection, bannerSection, prefixoSection, backRow];
}

function buildPrefixoEfemero(prefix) {
  const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Prefixo:** \`${prefix ?? "Não definido"}\``
    ),
    new TextDisplayBuilder().setContent(
      "-# Envie no chat o caractere a ser o prefixo do bot."
    )
  );
  return [container];
}

module.exports = { buildAparenciaPanel, buildPrefixoEfemero };
