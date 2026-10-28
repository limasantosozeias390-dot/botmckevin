const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  ActionRowBuilder,
} = require("discord.js");
const { addBackButton } = require("./backButton");

// Painel inicial (antes de clicar em "Configurar")
function buildPortariaIntro() {
  const section = new ContainerBuilder().addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("### Portaria"),
        new TextDisplayBuilder().setContent(
          "-# Configure as mensagens de boas-vindas no servidor."
        ),
        new TextDisplayBuilder().setContent("-# Clique no botão ao lado.")
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId("btn_portaria_abrir")
          .setLabel("Configurar")
          .setStyle(ButtonStyle.Secondary)
      )
  );

  addBackButton(section, "back_comunidade");
  return [section];
}

// Painel completo de configuração da portaria
function buildPortariaConfig(config) {
  const header = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent("**Portaria**"),
    new TextDisplayBuilder().setContent("-# Configurações abaixo.")
  );

  const welcomeContainer = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent("**Canal de destino**"),
    new TextDisplayBuilder().setContent(
      "-# Selecione o canal onde as mensagens de boas-vindas irão aparecer."
    ),
    new TextDisplayBuilder().setContent(
      `-# Canal: \`${config.welcomeChannel ? `<#${config.welcomeChannel}>` : "Não definido"}\``
    )
  );
  const welcomeSelect = new ChannelSelectMenuBuilder()
    .setCustomId("portaria_welcome_channel")
    .setPlaceholder("Selecione o canal de boas-vindas")
    .addChannelTypes(ChannelType.GuildText);
  welcomeContainer.addActionRowComponents(
    new ActionRowBuilder().addComponents(welcomeSelect)
  );

  const leaveContainer = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent("**Saída de membros**"),
    new TextDisplayBuilder().setContent(
      "-# Selecione o canal onde as mensagens de saídas de membros irão aparecer."
    ),
    new TextDisplayBuilder().setContent(
      `-# Canal: \`${config.leaveChannel ? `<#${config.leaveChannel}>` : "Não definido"}\``
    )
  );
  const leaveSelect = new ChannelSelectMenuBuilder()
    .setCustomId("portaria_leave_channel")
    .setPlaceholder("Selecione o canal de saída de membros")
    .addChannelTypes(ChannelType.GuildText);
  leaveContainer.addActionRowComponents(
    new ActionRowBuilder().addComponents(leaveSelect)
  );

  const mensagemSection = new ContainerBuilder().addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("**Mensagem**"),
        new TextDisplayBuilder().setContent(
          "-# Defina a mensagem de entradas ou saídas de membros."
        ),
        new TextDisplayBuilder().setContent(
          `-# Boas-vindas: \`${config.welcomeMessage ? "Definida" : "Não definida"}\`\n` +
            `-# Saídas: \`${config.leaveMessage ? "Definida" : "Não definida"}\``
        )
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId("btn_portaria_mensagens")
          .setLabel("Definir")
          .setStyle(ButtonStyle.Secondary)
      )
  );

  addBackButton(mensagemSection, "back_comunidade");

  return [header, welcomeContainer, leaveContainer, mensagemSection];
}

module.exports = { buildPortariaIntro, buildPortariaConfig };
