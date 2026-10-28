require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const { connectDatabase } = require("./database/connect");
const { registerLogEvents } = require("./logger/logEvents");
const { startKeepAliveServer } = require("./keepAlive");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration, // bans
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

client.commands = new Collection();

// Carrega comandos
const commandsPath = path.join(__dirname, "commands");
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.name, command);
}

// Carrega eventos
const eventsPath = path.join(__dirname, "events");
for (const file of fs.readdirSync(eventsPath).filter((f) => f.endsWith(".js"))) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

registerLogEvents(client);
startKeepAliveServer(client);

(async () => {
  await connectDatabase();
  await client.login(process.env.TOKEN);
})();
