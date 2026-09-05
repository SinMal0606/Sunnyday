const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../models/User');
const { gachaOnce, gachaMultiple } = require('../systems/gachaSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gacha')
    .setDescription('Gacha Relic bằng Murk')
    .addIntegerOption(option =>
      option.setName('số_lần')
        .setDescription('Số lần gacha (1 hoặc 10)')
        .setRequired(false)
        .addChoices(
          { name: '1 lần (100 Murk)', value: 1 },
          { name: '10 lần (900 Murk)', value: 10 }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const times = interaction.options.getInteger('số_lần') || 1;
    const cost = times === 10 ? 900 : 100;

    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
      return interaction.editReply('Bạn chưa có tài khoản. Hãy dùng `/start` trước.');
    }

    if (user.murk < cost) {
      return interaction.editReply(`Không đủ Murk!\nBạn đang có **${user.murk}** Murk.\nCần **${cost}** Murk.`);
    }

    // Trừ Murk
    user.murk -= cost;

    // Gacha
    const results = gachaMultiple(times);

    // Lưu vào túi relics
    for (const relic of results) {
      user.relics.push({
        relicId: relic.id,
        name: relic.name,
        rarity: relic.rarity,
        effects: relic.effects,
        equipped: false
      });
    }

    await user.save();

    // Tạo embed kết quả
    const embed = new EmbedBuilder()
      .setTitle(times === 10 ? 'Gacha x10' : 'Gacha x1')
      .setDescription(`Đã tiêu **${cost}** Murk\nMurk còn lại: **${user.murk}**`)
      .setColor(0x9B59B6);

    results.forEach((relic, index) => {
      embed.addFields({
        name: `${index + 1}. ${relic.name} (${relic.rarity})`,
        value: relic.description,
        inline: false
      });
    });

    await interaction.editReply({ embeds: [embed] });
  }
};