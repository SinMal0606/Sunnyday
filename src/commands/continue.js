const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require('discord.js');
const Run = require('../models/Run');
const nightlords = require('../data/nightlords');
const characters = require('../data/characters');
const { generateLocationChoices, locations } = require('../systems/locationSystem');
const { createCombatEmbed, createCombatButtons } = require('../systems/combatSystem');
const { createShopEmbed, createShopButtons } = require('../systems/shopSystem');
const { generateRewards, createRewardEmbed } = require('../systems/rewardSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('continue')
    .setDescription('Tiếp tục run đang dở'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const run = await Run.findOne({
      userId: interaction.user.id,
      status: 'active'
    });

    if (!run) {
      return interaction.editReply('Bạn không có run nào đang chạy.\nDùng `/start` để bắt đầu run mới.');
    }

    const phase = run.currentPhase;

    // ===== Chọn Nightlord =====
    if (phase === 'select_nightlord') {
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
        .setTitle('Tiếp tục Run – Chọn Nightlord')
        .setDescription('Hãy chọn Nightlord bạn muốn khiêu chiến.')
        .setColor(0x8B0000);

      return interaction.editReply({ embeds: [embed], components: rows });
    }

    // ===== Chọn Character =====
    if (phase === 'select_character') {
      const validCharacters = ['wylder', 'recluse', 'ironfist', 'seer'];
      const characterButtons = validCharacters.map(charId => {
        const char = characters[charId];
        return new ButtonBuilder()
          .setCustomId(`select_character:${charId}`)
          .setLabel(char.name)
          .setStyle(ButtonStyle.Primary);
      });

      const embed = new EmbedBuilder()
        .setTitle('Tiếp tục Run – Chọn Nhân vật')
        .setDescription(`Nightlord: **${nightlords[run.nightlord]?.name || run.nightlord}**`)
        .setColor(0x5865F2);

      return interaction.editReply({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(characterButtons)]
      });
    }

    // ===== Đang combat =====
    if (run.combat && (phase === 'exploring' || phase === 'miniboss1' || phase === 'miniboss2' || phase === 'nightlord')) {
      const embed = createCombatEmbed(run, run.combat);
      return interaction.editReply({
        content: '⚔️ Tiếp tục trận đấu:',
        embeds: [embed],
        components: createCombatButtons(run, false)
      });
    }

    // ===== Rest Area =====
    if (phase === 'rest') {
      const embed = new EmbedBuilder()
        .setTitle('🏕️ Rest Area')
        .setDescription('Chuẩn bị đối đầu Nightlord.')
        .setColor(0x1ABC9C)
        .addFields(
          { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
          { name: 'Mana', value: `${run.mana}/${run.maxMana}`, inline: true },
          { name: 'Level', value: `${run.level}`, inline: true },
          { name: 'Runes', value: `${run.runes}`, inline: true }
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rest_heal').setLabel('Hồi đầy HP/Mana').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('rest_levelup').setLabel('Lên cấp').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('rest_fight_nightlord').setLabel('Khiêu chiến Nightlord').setStyle(ButtonStyle.Danger)
      );

      return interaction.editReply({ embeds: [embed], components: [row] });
    }

    // ===== Đang chờ chọn phần thưởng =====
    if (run.tempRewards && run.tempRewards.length > 0) {
      const { embed, row } = createRewardEmbed(run, 'Phần thưởng', run.tempRewards, 0);
      return interaction.editReply({
        content: 'Bạn còn phần thưởng chưa chọn:',
        embeds: [embed],
        components: [row]
      });
    }

    // ===== Exploring – hiện 3 location =====
    if (phase === 'exploring') {
      const choices = generateLocationChoices(3);
      const locationButtons = choices.map(loc =>
        new ButtonBuilder()
          .setCustomId(`select_location:${loc.id}`)
          .setLabel(`${loc.emoji} ${loc.name}`)
          .setStyle(ButtonStyle.Secondary)
      );

      const charName = characters[run.character]?.name || run.character;
      const nightlordName = nightlords[run.nightlord]?.name || run.nightlord;

      const embed = new EmbedBuilder()
        .setTitle('Tiếp tục khám phá')
        .setDescription(`**${charName}** vs **${nightlordName}**\nHãy chọn địa điểm:`)
        .setColor(0x3498DB)
        .addFields(
          { name: 'Location đã đi', value: `${run.locationsVisited}`, inline: true },
          { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
          { name: 'Mana', value: `${run.mana}/${run.maxMana}`, inline: true },
          { name: 'Level', value: `${run.level}`, inline: true },
          { name: 'Runes', value: `${run.runes}`, inline: true }
        );

      return interaction.editReply({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(locationButtons)]
      });
    }

    // ===== Fallback =====
    return interaction.editReply(
      `Run đang ở phase: **${phase}**\n` +
      `HP: ${run.hp}/${run.maxHp} | Level: ${run.level} | Location: ${run.locationsVisited}\n` +
      `Nếu bị kẹt, thử \`/abandon\` rồi \`/start\` lại.`
    );
  }
};