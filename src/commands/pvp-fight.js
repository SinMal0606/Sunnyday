const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getMatchByUser, createPvPEmbed, createPvPButtons } = require('../systems/pvpSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pvp-fight')
    .setDescription('Mở lại màn hình combat PvP đang diễn ra'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const match = getMatchByUser(interaction.user.id);
    if (!match || match.status !== 'active') {
      return interaction.editReply('Bạn không có trận PvP nào đang diễn ra.');
    }

    const embed = createPvPEmbed(match);
    const components = createPvPButtons(match, interaction.user.id);

    await interaction.editReply({
      content: match.currentTurn === interaction.user.id
        ? '▶️ **Đến lượt bạn!**'
        : '⏳ Đợi đối thủ đánh...',
      embeds: [embed],
      components
    });
  }
};