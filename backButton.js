const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

function buildBackButton(customId) {
  const button = new ButtonBuilder()
    .setCustomId(customId)
    .setLabel("Voltar")
    .setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder().addComponents(button);
}

module.exports = { buildBackButton };
