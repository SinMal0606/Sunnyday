const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('relics')
    .setDescription('Xem và quản lý Relic'),

  async execute(interaction) {
    await interaction.reply({ content: 'Hệ thống Relic & Gacha sẽ được làm ở phase sau.', ephemeral: true });
  }
};