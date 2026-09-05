const { SlashCommandBuilder } = require('discord.js');
const Run = require('../models/Run');
const { createInventoryEmbed, createInventoryComponents } = require('../systems/inventorySystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Xem và quản lý túi đồ trong run hiện tại'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });

    if (!run) {
      return interaction.editReply({ content: 'Bạn không có run nào đang chạy.' });
    }

    if (!run.character) {
      return interaction.editReply({ content: 'Bạn chưa chọn nhân vật.' });
    }

    const embed = createInventoryEmbed(run);
    const components = createInventoryComponents(run);

    await interaction.editReply({ embeds: [embed], components });
  }
};