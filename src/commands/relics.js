const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const User = require('../models/User');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('relics')
    .setDescription('Xem và trang bị Relic'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
      return interaction.editReply('Bạn chưa có tài khoản.');
    }

    if (!user.relics || user.relics.length === 0) {
      return interaction.editReply('Bạn chưa có Relic nào.\nHãy dùng `/gacha` để quay.');
    }

    const equipped = user.relics.filter(r => r.equipped);
    const unequipped = user.relics.filter(r => !r.equipped);

    const embed = new EmbedBuilder()
      .setTitle('Relic của bạn')
      .setColor(0x9B59B6)
      .addFields(
        {
          name: `Đang trang bị (${equipped.length})`,
          value: equipped.length > 0
            ? equipped.map(r => `**${r.name}** (${r.rarity})`).join('\n')
            : '*Chưa trang bị gì*',
          inline: false
        },
        {
          name: `Túi Relic (${unequipped.length})`,
          value: unequipped.length > 0
            ? unequipped.slice(0, 15).map((r, i) => `\`${i + 1}.\` ${r.name} (${r.rarity})`).join('\n')
            : '*Trống*',
          inline: false
        },
        { name: 'Murk', value: `${user.murk}`, inline: true }
      )
      .setFooter({ text: 'Có thể trang bị tối đa 3 Relic' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('relic_equip')
        .setLabel('Trang bị Relic')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(unequipped.length === 0),
      new ButtonBuilder()
        .setCustomId('relic_unequip')
        .setLabel('Tháo Relic')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(equipped.length === 0)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  }
};