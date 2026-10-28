const { MessageFlags } = require("discord.js");
const { getPrefix } = require("../utils/getPrefix");
const { getGuildConfig } = require("../database/getGuildConfig");
const { waitingForPrefix, key } = require("../handlers/prefixWait");
const { buildPrefixoEfemero } = require("../ui/aparencia");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    // 1) Verifica se este usuário está no meio do fluxo "definir prefixo"
    const waitKey = key(message.guild.id, message.author.id, message.channel.id);
    if (waitingForPrefix.has(waitKey)) {
      const { interaction } = waitingForPrefix.get(waitKey);
      const novoPrefixo = message.content.trim().slice(0, 5);

      // Apaga a mensagem do usuário assim que ele enviar
      message.delete().catch(() => {});

      if (!novoPrefixo) return;

      const config = await getGuildConfig(message.guild.id);
      config.prefix = novoPrefixo;
      await config.save();

      // Atualiza a efêmera na hora com o novo prefixo
      await interaction
        .editReply({
          components: buildPrefixoEfemero(novoPrefixo),
          flags: MessageFlags.IsComponentsV2,
        })
        .catch((err) => console.error("[PREFIXO] Erro ao atualizar efêmera:", err.message));

      waitingForPrefix.delete(waitKey);
      return;
    }

    // 2) Comandos normais por prefixo
    const prefix = await getPrefix(message.guild.id);
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    const command = message.client.commands.get(commandName);
    if (!command) return;

    try {
      await command.execute(message, args);
    } catch (err) {
      console.error(`[COMANDO] Erro ao executar "${commandName}":`, err);
      message.channel.send("Ocorreu um erro ao executar este comando.").catch(() => {});
    }
  },
};
