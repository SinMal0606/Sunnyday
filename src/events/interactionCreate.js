const { InteractionType } = require('discord.js');
const nightlords = require('../data/nightlords');
const characters = require('../data/characters');
const Run = require('../models/Run');
const { applyCharacterToRun } = require('../systems/characterSystem');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // ===== Xử lý Slash Command =====
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        const reply = { content: 'Có lỗi xảy ra khi thực hiện lệnh này.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
      return;
    }

    // ===== Xử lý Button =====
    if (interaction.isButton()) {
      const [action, value] = interaction.customId.split(':');

      try {
        // ---------- Chọn Nightlord ----------
        if (action === 'select_nightlord') {
          await interaction.deferUpdate();

          const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
          if (!run || run.currentPhase !== 'select_nightlord') {
            return interaction.followUp({ content: 'Run không hợp lệ hoặc đã chọn Nightlord rồi.', ephemeral: true });
          }

          const nightlord = nightlords[value];
          if (!nightlord) {
            return interaction.followUp({ content: 'Nightlord không tồn tại.', ephemeral: true });
          }

          run.nightlord = value;
          run.currentPhase = 'select_character';
          await run.save();

          // Tạo danh sách Character
          const User = require('../models/User');
          const user = await User.findOne({ discordId: interaction.user.id });
          const unlocked = user?.unlockedCharacters || ['wylder'];

          const characterButtons = unlocked.map(charId => {
            const char = characters[charId];
            if (!char) return null;
            return new ButtonBuilder()
              .setCustomId(`select_character:${charId}`)
              .setLabel(char.name)
              .setStyle(ButtonStyle.Primary);
          }).filter(Boolean);

          // Chia thành nhiều hàng (tối đa 5 button/hàng)
          const rows = [];
          for (let i = 0; i < characterButtons.length; i += 5) {
            rows.push(new ActionRowBuilder().addComponents(characterButtons.slice(i, i + 5)));
          }

          const embed = new EmbedBuilder()
            .setTitle('Chọn Nhân vật')
            .setDescription(`Bạn đã chọn **${nightlord.name}**.\nHãy chọn nhân vật để bắt đầu run.`)
            .setColor(0x5865F2)
            .addFields(
              { name: 'Nightlord', value: nightlord.name, inline: true },
              { name: 'Độ khó', value: nightlord.difficulty, inline: true }
            );

          await interaction.editReply({ embeds: [embed], components: rows });
        }

        // ---------- Chọn Character ----------
        if (action === 'select_character') {
          await interaction.deferUpdate();

          const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
          if (!run || run.currentPhase !== 'select_character') {
            return interaction.followUp({ content: 'Run không hợp lệ hoặc đã chọn nhân vật rồi.', ephemeral: true });
          }

          const charId = value;
          const char = characters[charId];
          if (!char) {
            return interaction.followUp({ content: 'Nhân vật không tồn tại.', ephemeral: true });
          }

          // Áp dụng character vào run
          applyCharacterToRun(run, charId);
          run.currentPhase = 'exploring';
          await run.save();

          const embed = new EmbedBuilder()
            .setTitle('Run đã sẵn sàng!')
            .setDescription(`Bạn sẽ đối đầu với **${nightlords[run.nightlord]?.name || run.nightlord}** bằng **${char.name}**.`)
            .setColor(0x57F287)
            .addFields(
              { name: 'Nhân vật', value: char.name, inline: true },
              { name: 'Level', value: `${run.level}`, inline: true },
              { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
              { name: 'Mana', value: `${run.mana}/${run.maxMana}`, inline: true },
              { name: 'Vigor', value: `${run.stats.vigor}`, inline: true },
              { name: 'Strength', value: `${run.stats.strength}`, inline: true },
              { name: 'Dexterity', value: `${run.stats.dexterity}`, inline: true },
              { name: 'Intelligence', value: `${run.stats.intelligence}`, inline: true },
              { name: 'Faith', value: `${run.stats.faith}`, inline: true },
              { name: 'Agility', value: `${run.stats.agility}`, inline: true },
              { name: 'Mind', value: `${run.stats.mind}`, inline: true }
            )
            .setFooter({ text: 'Sẵn sàng khám phá. Hệ thống Location sẽ được thêm ở phase tiếp theo.' });

          await interaction.editReply({ embeds: [embed], components: [] });
        }

      } catch (error) {
        console.error('Button error:', error);
        await interaction.followUp({ content: 'Đã xảy ra lỗi khi xử lý lựa chọn.', ephemeral: true }).catch(() => {});
      }
    }
  },
};