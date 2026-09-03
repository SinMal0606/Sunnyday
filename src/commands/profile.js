import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import User from '../models/User.js';

export default {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Xem thông tin Nightfarer của bạn'),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const user = await User.findOne({ discordId });

    if (!user) {
      return interaction.reply({
        content: 'Bạn chưa đăng ký! Hãy dùng lệnh `/start` trước.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x1a1a2e)
      .setTitle(`📜 Hồ sơ Nightfarer — ${user.username}`)
      .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
      .addFields(
        {
          name: 'Class đã mở khóa',
          value: user.unlockedClasses.map(c => `• ${c}`).join('\n') || '• Wylder',
          inline: false,
        },
        {
          name: 'Murk',
          value: `**${user.murk}**`,
          inline: true,
        },
        {
          name: 'Permanent Stats',
          value:
            `Strength: **${user.permanentStats.strength}**\n` +
            `Dexterity: **${user.permanentStats.dexterity}**\n` +
            `Intelligence: **${user.permanentStats.intelligence}**\n` +
            `Vigor: **${user.permanentStats.vigor}**`,
          inline: true,
        },
        {
          name: 'Thống kê Expedition',
          value:
            `Tổng số run: **${user.totalExpeditions}**\n` +
            `Thành công: **${user.successfulExpeditions}**\n` +
            `Nightlord hạ gục: **${user.nightlordKills}**\n` +
            `Ngày cao nhất: **${user.highestDayReached}**`,
          inline: false,
        }
      )
      .setFooter({ text: 'The night is long...' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};