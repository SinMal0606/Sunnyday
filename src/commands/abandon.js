const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Run = require('../models/Run');
const User = require('../models/User');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('abandon')
    .setDescription('Bỏ cuộc run hiện tại (sẽ mất toàn bộ tiến độ run)'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const discordId = interaction.user.id;

    const activeRun = await Run.findOne({ userId: discordId, status: 'active' });

    if (!activeRun) {
      return interaction.editReply({
        content: 'Bạn không có run nào đang chạy.'
      });
    }

    // Đánh dấu run là abandoned
    activeRun.status = 'abandoned';
    activeRun.currentPhase = 'ended';
    await activeRun.save();

const murkGained = 8 + Math.floor((activeRun.locationsVisited || 0) * 0.5);

await User.findOneAndUpdate(
  { discordId },
  { 
    $inc: { murk: murkGained, totalRuns: 1 },
    lastActive: new Date()
  }
);

    const embed = new EmbedBuilder()
      .setTitle('Run đã bị bỏ cuộc')
      .setDescription('Bạn đã từ bỏ run hiện tại.\nToàn bộ tiến độ (đồ, level, runes...) trong run này đã bị mất.')
      .setColor(0xFF0000)
      .addFields(
        { name: 'Nightlord', value: activeRun.nightlord || 'Chưa chọn', inline: true },
        { name: 'Nhân vật', value: activeRun.character || 'Chưa chọn', inline: true },
        { name: 'Số location đã đi', value: `${activeRun.locationsVisited}`, inline: true }
      )
      .setFooter({ text: 'Dùng /start để bắt đầu run mới' });

    await interaction.editReply({ embeds: [embed] });
  }
};