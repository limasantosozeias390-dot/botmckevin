module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`[BOT] Online como ${client.user.tag}`);
  },
};
