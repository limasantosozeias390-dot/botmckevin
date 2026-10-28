const { Schema, model } = require("mongoose");

const guildConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },

  // Aparência / prefixo
  prefix: { type: String, default: null },

  // Portaria (boas-vindas / saídas)
  welcomeChannel: { type: String, default: null },
  leaveChannel: { type: String, default: null },
  welcomeMessage: { type: String, default: null },
  leaveMessage: { type: String, default: null },

  // Auto-roles
  autoRoles: { type: [String], default: [] },

  // Logs do servidor
  logsChannel: { type: String, default: null },
});

module.exports = model("GuildConfig", guildConfigSchema);
