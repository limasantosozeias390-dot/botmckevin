const { getGuildConfig } = require("../database/getGuildConfig");
const { formatMessage } = require("../utils/formatMessage");

module.exports = {
  name: "guildMemberRemove",
  async execute(member) {
    const config = await getGuildConfig(member.guild.id);
    if (!config.leaveChannel) return;

    const channel = member.guild.channels.cache.get(config.leaveChannel);
    if (!channel) return;

    const content =
      formatMessage(config.leaveMessage, member) ?? `<@${member.id}> saiu do servidor.`;
    channel.send({ content }).catch(() => {});
  },
};
