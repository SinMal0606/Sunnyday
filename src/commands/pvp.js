const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const User = require('../models/User');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pvp')
    .setDescription('PvP 1v1 bằng build đã lưu'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
      return interaction.editReply('Bạn chưa có tài khoản. Hãy `/start` trước.');
    }

    if (!user.savedBuilds || user.savedBuilds.length === 0) {
      return interaction.editReply('Bạn chưa có build nào.\nHãy chơi hết một run rồi **Lưu Build** khi kết thúc.');
    }

    const embed = new EmbedBuilder()
      .setTitle('PvP – Chọn Build')
      .setDescription('Chọn 1 build để mang vào PvP:')
      .setColor(0xE74C3C);

    user.savedBuilds.forEach((b, i) => {
      embed.addFields({
        name: `${i + 1}. ${b.name}`,
        value: `Level ${b.level} | HP ${b.maxHp} | Mana ${b.maxMana}`,
        inline: false
      });
    });

    const buttons = user.savedBuilds.slice(0, 5).map((b, i) =>
      new ButtonBuilder()
        .setCustomId(`pvp_select_build:${i}`)
        .setLabel(`${i + 1}. ${b.name}`.slice(0, 80))
        .setStyle(ButtonStyle.Danger)
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    await interaction.editReply({ embeds: [embed], components: rows });
  }
};