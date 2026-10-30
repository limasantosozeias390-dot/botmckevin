const { MessageFlags } = require("discord.js");
const { buildBoosterPanel } = require("../ui/booster");
const { STAFF_ROLE_IDS } = require("../utils/ticketConfig");

module.exports = {
  name: "booster",
  async execute(message) {
    // Apenas os cargos da equipe podem usar o comando
    if (!message.member.roles.cache.hasAny(...STAFF_ROLE_IDS)) {
      const warning = await message.channel
        .send("Você não tem permissão para usar esse comando.")
        .catch(() => null);

      setTimeout(() => {
        warning?.delete().catch(() => {});
        message.delete().catch(() => {});
      }, 5000);
      return;
    }

    message.delete().catch(() => {});

    await message.channel.send({
      components: buildBoosterPanel(),
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
