const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

function buildMensagensModal(config) {
  const modal = new ModalBuilder()
    .setCustomId("modal_mensagens")
    .setTitle("Mensagens de boas-vindas e saída");

  const welcomeInput = new TextInputBuilder()
    .setCustomId("welcome_message")
    .setLabel("Mensagem de boas-vindas")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setPlaceholder("Ex: Seja bem-vindo(a), {user}!");
  if (config.welcomeMessage) welcomeInput.setValue(config.welcomeMessage);

  const leaveInput = new TextInputBuilder()
    .setCustomId("leave_message")
    .setLabel("Mensagem de saída")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setPlaceholder("Ex: {user} saiu do servidor.");
  if (config.leaveMessage) leaveInput.setValue(config.leaveMessage);

  modal.addComponents(
    new ActionRowBuilder().addComponents(welcomeInput),
    new ActionRowBuilder().addComponents(leaveInput)
  );

  return modal;
}

module.exports = { buildMensagensModal };
