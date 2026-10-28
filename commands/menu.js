const { MessageFlags } = require("discord.js");
const { buildMainMenu } = require("../ui/mainMenu");

module.exports = {
  name: "menu",
  async execute(message) {
    await message.channel.send({
      components: buildMainMenu(),
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
