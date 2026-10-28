// Map<"guildId:userId:channelId", { interaction }>
const waitingForPrefix = new Map();

function key(guildId, userId, channelId) {
  return `${guildId}:${userId}:${channelId}`;
}

module.exports = { waitingForPrefix, key };
