// Map<"guildId:userId:channelId", { ephemeralMessage }>
const waitingForPrefix = new Map();

function key(guildId, userId, channelId) {
  return `${guildId}:${userId}:${channelId}`;
}

module.exports = { waitingForPrefix, key };
