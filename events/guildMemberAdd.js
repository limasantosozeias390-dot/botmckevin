const { getGuildConfig } = require("../database/getGuildConfig");
const { formatMessage } = require("../utils/formatMessage");

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    const config = await getGuildConfig(member.guild.id);

    // Auto-roles
    if (config.autoRoles?.length) {
      for (const roleId of config.autoRoles) {
        const role = member.guild.roles.cache.get(roleId);
        if (role) member.roles.add(role).catch(() => {});
      }
    }

    // Boas-vindas
    if (config.welcomeChannel) {
      const channel = member.guild.channels.cache.get(config.welcomeChannel);
      if (channel) {
        const content =
          formatMessage(config.welcomeMessage, member) ?? `Bem-vindo(a), <@${member.id}>!`;
        channel.send({ content }).catch(() => {});
      }
    }
  },
};
