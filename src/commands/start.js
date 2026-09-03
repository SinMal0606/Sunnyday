import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import User from '../models/User.js';

export default {
  data: new SlashCommandBuilder()
    .setName('start')
    .setDescription('Bắt đầu hành trình Nightfarer của bạn'),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const username = interaction.user.username;

    let user = await User.findOne({ discordId });

    if (user) {
      return interaction.reply({
        content: `Bạn đã là Nightfarer rồi!\nDùng \`/profile\` để xem thông tin hoặc \`/expedition\` để bắt đầu chuyến thám hiểm.`,
        ephemeral: true,
      });
    }

    user = await User.create({
      discordId,
      username,
    });

    const embed = new EmbedBuilder()
      .setColor(0x8B0000)
      .setTitle('⚔️ Chào mừng Nightfarer')
      .setDescription(
        `Bạn đã thức dậy dưới **Reign of Night**.\n\n` +
        `Class khởi đầu đã mở khóa: **Wylder**\n` +
        `Murk hiện tại: **0**\n\n` +
        `Mỗi lần bắt đầu **Expedition**, bạn sẽ được chọn Nightfarer từ những class đã mở khóa.\n\n` +
        `Dùng \`/profile\` để xem hồ sơ.`
      )
      .setFooter({ text: 'Limveld awaits...' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};