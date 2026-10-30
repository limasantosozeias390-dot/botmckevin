const { ActivityType } = require("discord.js");
const { DEFAULT_PREFIX } = require("../utils/getPrefix");

module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`[BOT] Online como ${client.user.tag}`);

    // Online + transmissão (bolinha roxa). O link precisa ser do Twitch/YouTube.
    client.user.setPresence({
      status: "online",
      activities: [
        {
          name: `Prefixo: ${DEFAULT_PREFIX}`,
          type: ActivityType.Streaming,
          url: "https://www.twitch.tv/discord",
        },
      ],
    });
  },
};
