const {
  ContainerBuilder,
  TextDisplayBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  ActionRowBuilder,
} = require("discord.js");
const { buildBackButton } = require("./backButton");

function buildLogsPanel(config) {
  const header = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent("### Logs do servidor"),
    new TextDisplayBuilder().setContent("-# Configurações de logs e registros do servidor.")
  );

  const canalContainer = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent("**Canal de destino**"),
    new TextDisplayBuilder().setContent(
      "-# Selecione o canal de destino onde irão ser enviadas as logs."
    ),
    new TextDisplayBuilder().setContent(
      `-# Canal: \`${config.logsChannel ? `<#${config.logsChannel}>` : "Não definido"}\``
    ),
    new TextDisplayBuilder().setContent(
      "-# Serão enviadas logs de: Entradas/Saídas, Banimentos/Punições (mute, unmute, ban, unban), Expulsões, Cargos, Canais, Fluxo de call e Mensagens editadas/excluídas."
    )
  );
  const select = new ChannelSelectMenuBuilder()
    .setCustomId("logs_channel")
    .setPlaceholder("Selecione o canal de logs")
    .addChannelTypes(ChannelType.GuildText);
  canalContainer.addActionRowComponents(
    new ActionRowBuilder().addComponents(select)
  );

  const backRow = buildBackButton("back_comunidade");

  return [header, canalContainer, backRow];
}

module.exports = { buildLogsPanel };
