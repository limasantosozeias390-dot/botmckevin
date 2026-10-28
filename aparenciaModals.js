const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
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

// OBS: upload de arquivo direto em modal é um recurso muito recente da API do
// Discord (componente "File Upload" em modais) e ainda tem suporte limitado
// nas libs. Aqui deixamos o campo de link, que funciona de forma garantida.
// Se quiser o upload por arquivo, será necessário usar a API bruta com o
// componente de tipo File Upload (type 19) assim que seu discord.js suportar.
function buildAvatarModal() {
  const modal = new ModalBuilder().setCustomId("modal_avatar").setTitle("Avatar do bot");

  const linkInput = new TextInputBuilder()
    .setCustomId("avatar_link")
    .setLabel("Link da imagem (URL)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder("https://exemplo.com/imagem.png");

  modal.addComponents(new ActionRowBuilder().addComponents(linkInput));
  return modal;
}

function buildBannerModal() {
  const modal = new ModalBuilder().setCustomId("modal_banner").setTitle("Banner do bot");

  const linkInput = new TextInputBuilder()
    .setCustomId("banner_link")
    .setLabel("Link da imagem (URL)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder("https://exemplo.com/banner.png");

  modal.addComponents(new ActionRowBuilder().addComponents(linkInput));
  return modal;
}

module.exports = { buildNomeModal, buildAvatarModal, buildBannerModal };
