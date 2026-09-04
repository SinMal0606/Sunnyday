const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Xem túi đồ trong run hiện tại'),

  async execute(interaction) {
    await interaction.reply({ content: 'Hệ thống inventory sẽ được hoàn thiện ở phase sau.', ephemeral: true });
  }
};