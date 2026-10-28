const BotConfig = require("../database/models/BotConfig");
const { getGuildConfig } = require("../database/getGuildConfig");
const { buildPortariaConfig } = require("../ui/portaria");

async function getBotConfig() {
  let config = await BotConfig.findById("global");
  if (!config) config = await BotConfig.create({});
  return config;
}

async function handleModal(interaction) {
  const { customId } = interaction;

  switch (customId) {
    case "modal_nome": {
      const nome = interaction.fields.getTextInputValue("nome_input");
      try {
        await interaction.client.user.setUsername(nome);
        const botConfig = await getBotConfig();
        botConfig.name = nome;
        await botConfig.save();
        return interaction.reply({
          content: `Nome do bot atualizado para **${nome}**.`,
          ephemeral: true,
        });
      } catch (err) {
        console.error("[MODAL NOME] Erro:", err);
        return interaction.reply({
          content:
            "Não foi possível alterar o nome agora (o Discord limita trocas de nome com frequência).",
          ephemeral: true,
        });
      }
    }

    case "modal_avatar": {
      const link = interaction.fields.getTextInputValue("avatar_link");
      try {
        await interaction.client.user.setAvatar(link);
        const botConfig = await getBotConfig();
        botConfig.avatar = link;
        await botConfig.save();
        return interaction.reply({
          content: "Avatar do bot atualizado com sucesso.",
          ephemeral: true,
        });
      } catch (err) {
        console.error("[MODAL AVATAR] Erro:", err);
        return interaction.reply({
          content: "Não foi possível definir esse link como avatar. Verifique se é uma imagem válida.",
          ephemeral: true,
        });
      }
    }

    case "modal_banner": {
      const link = interaction.fields.getTextInputValue("banner_link");
      try {
        await interaction.client.user.setBanner(link);
        const botConfig = await getBotConfig();
        botConfig.banner = link;
        await botConfig.save();
        return interaction.reply({
          content: "Banner do bot atualizado com sucesso.",
          ephemeral: true,
        });
      } catch (err) {
        console.error("[MODAL BANNER] Erro:", err);
        return interaction.reply({
          content:
            "Não foi possível definir esse link como banner (lembre-se: banner exige Nitro na conta do bot).",
          ephemeral: true,
        });
      }
    }

    case "modal_mensagens": {
      const welcome = interaction.fields.getTextInputValue("welcome_message");
      const leave = interaction.fields.getTextInputValue("leave_message");

      const config = await getGuildConfig(interaction.guild.id);
      config.welcomeMessage = welcome || null;
      config.leaveMessage = leave || null;
      await config.save();

      return interaction.update({ components: buildPortariaConfig(config) });
    }

    default:
      return;
  }
}

module.exports = { handleModal };
