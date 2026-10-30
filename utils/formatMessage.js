// Troca as variáveis das mensagens de boas-vindas/saída
function formatMessage(template, member) {
  if (!template) return null;
  return template
    .replaceAll("{user}", `<@${member.id}>`)
    .replaceAll("{usertag}", member.user?.tag ?? member.tag ?? "")
    .replaceAll("{server}", member.guild.name);
}

module.exports = { formatMessage };
