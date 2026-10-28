const { Schema, model } = require("mongoose");

// Documento único (_id fixo "global") pois nome/avatar/banner
// são propriedades globais do bot (client.user), não por servidor.
const botConfigSchema = new Schema({
  _id: { type: String, default: "global" },
  name: { type: String, default: null },
  avatar: { type: String, default: null },
  banner: { type: String, default: null },
});

module.exports = model("BotConfig", botConfigSchema);
