const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  LabelBuilder,
  FileUploadBuilder,
} = require("discord.js");

function buildNomeModal() {
  const modal = new ModalBuilder().setCustomId("modal_nome").setTitle("Nome do bot");

  const input = new TextInputBuilder()
    .setCustomId("nome_input")
    .setLabel("Novo nome do bot")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(32)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

function buildUploadModal({ customId, title, inputId, label }) {
  const modal = new ModalBuilder().setCustomId(customId).setTitle(title);

  const upload = new FileUploadBuilder()
    .setCustomId(inputId)
    .setMinValues(1)
    .setMaxValues(1)
    .setRequired(true);

  const fileLabel = new LabelBuilder()
    .setLabel(label)
    .setDescription("Toque aqui e escolha uma imagem da sua galeria.")
    .setFileUploadComponent(upload);

  modal.addLabelComponents(fileLabel);
  return modal;
}

function buildAvatarModal() {
  return buildUploadModal({
    customId: "modal_avatar",
    title: "Avatar do bot",
    inputId: "avatar_file",
    label: "Imagem do avatar",
  });
}

function buildBannerModal() {
  return buildUploadModal({
    customId: "modal_banner",
    title: "Banner do bot",
    inputId: "banner_file",
    label: "Imagem do banner",
  });
}

module.exports = { buildNomeModal, buildAvatarModal, buildBannerModal };
