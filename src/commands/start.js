const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const User = require('../models/User');
const Run = require('../models/Run');
const nightlords = require('../data/nightlords');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('start')
    .setDescription('Bắt đầu một run mới'),

  async execute(interaction) {
    // Defer ngay lập tức
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const discordId = interaction.user.id;

      let user = await User.findOne({ discordId });
      if (!user) {
        user = await User.create({
          discordId,
          username: interaction.user.username,
          unlockedCharacters: ['wylder', 'recluse', 'ironfist', 'seer']
        });
      } else if (!user.unlockedCharacters || user.unlockedCharacters.length === 0) {
        user.unlockedCharacters = ['wylder', 'recluse', 'ironfist', 'seer'];
        await user.save();
      }

      const existingRun = await Run.findOne({ userId: discordId, status: 'active' });
      if (existingRun) {
        return interaction.editReply({
          content: 'Bạn đang có một run đang chạy. Hãy dùng `/abandon` nếu muốn bỏ cuộc.'
        });
      }

      const newRun = await Run.create({
        userId: discordId,
        status: 'active',
        currentPhase: 'select_nightlord'
      });

      const buttons = Object.values(nightlords).map(nl =>
        new ButtonBuilder()
          .setCustomId(`select_nightlord:${nl.id}`)
          .setLabel(nl.name)
          .setStyle(ButtonStyle.Danger)
      );

      const rows = [];
      for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
      }

      const embed = new EmbedBuilder()
        .setTitle('Nightreign - Bắt đầu Run')
        .setDescription('Hãy chọn **Nightlord** bạn muốn khiêu chiến.')
        .setColor(0x8B0000)
        .addFields(
          { name: 'Trạng thái', value: 'Đang chờ chọn Nightlord', inline: true },
          { name: 'Run ID', value: newRun._id.toString().slice(-6), inline: true }
        );

      await interaction.editReply({ embeds: [embed], components: rows });
    } catch (error) {
      console.error('Start command error:', error);
      await interaction.editReply({ content: 'Có lỗi xảy ra khi bắt đầu run.' }).catch(() => {});
    }
  }
};