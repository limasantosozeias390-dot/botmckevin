const {
  ContainerBuilder,
  TextDisplayBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
} = require("discord.js");
const { addBackButton } = require("./backButton");

function buildComunidadePanel() {
  const header = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent("### Comunidade e interação"),
    new TextDisplayBuilder().setContent("-# Configurações da comunidade e interações.")
  );

  const selectContainer = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent("**Selecione abaixo**"),
    new TextDisplayBuilder().setContent("-# Configurações de comunidade.")
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId("comunidade_menu")
    .setPlaceholder("Selecione uma opção")
    .addOptions(
      { label: "Portaria", description: "Configure as mensagens de boas-vindas no servidor.", value: "portaria" },
      { label: "Auto-roles", description: "Configure os cargos automáticos.", value: "autoroles" }
    );

  const selectRow = new ActionRowBuilder().addComponents(select);
  selectContainer.addActionRowComponents(selectRow);

  addBackButton(selectContainer, "back_main");

  return [header, selectContainer];
}

module.exports = { buildComunidadePanel };
