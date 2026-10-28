const { handleButton } = require("../handlers/buttonHandlers");
const { handleSelect } = require("../handlers/selectHandlers");
const { handleModal } = require("../handlers/modalHandlers");

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    try {
      if (interaction.isButton()) {
        return await handleButton(interaction);
      }

      if (
        interaction.isStringSelectMenu() ||
        interaction.isChannelSelectMenu() ||
        interaction.isRoleSelectMenu()
      ) {
        return await handleSelect(interaction);
      }

      if (interaction.isModalSubmit()) {
        return await handleModal(interaction);
      }
    } catch (err) {
      console.error("[INTERACTION] Erro:", err);
      const payload = {
        content: "Ocorreu um erro ao processar essa ação.",
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        interaction.followUp(payload).catch(() => {});
      } else {
        interaction.reply(payload).catch(() => {});
      }
    }
  },
};
