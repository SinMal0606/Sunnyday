const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');
const Run = require('../models/Run');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Xem thông tin tài khoản của bạn'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
      return interaction.editReply('Bạn chưa từng chơi. Hãy dùng `/start` trước.');
    }

    const activeRun = await Run.findOne({ userId: interaction.user.id, status: 'active' });

    const embed = new EmbedBuilder()
      .setTitle(`Hồ sơ của ${interaction.user.username}`)
      .setColor(0x2f3136)
      .addFields(
        { name: 'Murk', value: `${user.murk}`, inline: true },
        { name: 'Tổng Run', value: `${user.totalRuns}`, inline: true },
        { name: 'Thắng', value: `${user.wins}`, inline: true },
        { name: 'Nhân vật đã mở', value: user.unlockedCharacters.join(', ') || 'Chưa có', inline: false },
        { name: 'Run đang chạy', value: activeRun ? `Có (Phase: ${activeRun.currentPhase})` : 'Không', inline: false }
      )
      .setFooter({ text: `Tham gia từ ${user.createdAt.toLocaleDateString('vi-VN')}` });

    await interaction.editReply({ embeds: [embed] });
  }
};