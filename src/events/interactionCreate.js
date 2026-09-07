const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MessageFlags
} = require('discord.js');

const nightlords = require('../data/nightlords');
const characters = require('../data/characters');
const Run = require('../models/Run');
const User = require('../models/User');

const {
  applyCharacterToRun,
  calculateStats,
  calculateMaxHp,
  calculateMaxMana
} = require('../systems/characterSystem');

const {
  generateLocationChoices,
  getSpecialEvent,
  handleLocation,
  locations,
  getMiniboss
} = require('../systems/locationSystem');

const { generateRewards, createRewardEmbed } = require('../systems/rewardSystem');
const {
  applyEquipmentStats,
  createInventoryEmbed,
  createInventoryComponents
} = require('../systems/inventorySystem');

const {
  createCombatState,
  createCombatEmbed,
  createCombatButtons,
  calculatePlayerDamage,
  calculateEnemyDamage,
  calculateSpellDamage,
  applyResistance,
  tryDodge,
  processStatusEffects,
  runAutoTurn,
  handleRunDefeat
} = require('../systems/combatSystem');

const {
  createShopEmbed,
  createShopButtons,
  buyItem
} = require('../systems/shopSystem');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // ====================== SLASH COMMAND ======================
if (interaction.isChatInputCommand()) {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    const msg = { content: 'Có lỗi xảy ra khi thực hiện lệnh này.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
  return;
}

    // ====================== SELECT MENU ======================
    if (interaction.isStringSelectMenu()) {
      try {
        await interaction.deferUpdate();
      } catch {
        return;
      }

      const [action, value] = interaction.customId.split(':');

      try {
        if (action === 'inv_select') {
          const equipKey = value;
          const selectedIndex = parseInt(interaction.values[0]);

          const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
          if (!run) return;

          const listKeyMap = {
            weapon: 'weapons',
            armor: 'armors',
            staff: 'staffs',
            seal: 'seals'
          };

          const listKey = listKeyMap[equipKey];
          const items = run.inventory?.[listKey] || [];
          const selectedItem = items[selectedIndex];

          if (!selectedItem) {
            return interaction.followUp({ content: 'Món đồ không tồn tại.', flags: MessageFlags.Ephemeral });
          }

          if (!run.inventory.equipped) run.inventory.equipped = {};
          run.inventory.equipped[equipKey] = selectedItem;

          applyEquipmentStats(run);
          run.markModified('inventory');
          await run.save();

          const embed = createInventoryEmbed(run);
          const components = createInventoryComponents(run);

          await interaction.editReply({
            content: `Đã mặc **${selectedItem.name}**!`,
            embeds: [embed],
            components
          });
        }

        if (action === 'relic_select_equip') {
          const selectedIndex = parseInt(interaction.values[0]);
          const user = await User.findOne({ discordId: interaction.user.id });
          if (!user) return;

          const unequipped = user.relics.filter(r => !r.equipped);
          const selected = unequipped[selectedIndex];
          if (!selected) {
            return interaction.followUp({ content: 'Relic không tồn tại.', flags: MessageFlags.Ephemeral });
          }

          const relicInDb = user.relics.find(
            r => r.relicId === selected.relicId && !r.equipped && r.name === selected.name
          );
          if (relicInDb) relicInDb.equipped = true;

          await user.save();
          await interaction.editReply({
            content: `Đã trang bị **${selected.name}**!`,
            embeds: [],
            components: []
          });
        }
      } catch (error) {
        console.error('SelectMenu error:', error);
      }
      return;
    }

    // ====================== BUTTON ======================
    if (!interaction.isButton()) return;

// Chỉ 1 lần duy nhất
if (!interaction.deferred && !interaction.replied) {
  try {
    await interaction.deferUpdate();
  } catch (err) {
    console.error('deferUpdate failed:', err.message);
    return;
  }
}

    const [action, value] = interaction.customId.split(':');

    try {
      // ---------- Inventory ----------
      if (action === 'inv_equip_weapon' || action === 'inv_equip_armor' ||
          action === 'inv_equip_staff' || action === 'inv_equip_seal') {

        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run) return;

        const typeMap = {
          inv_equip_weapon: 'weapons',
          inv_equip_armor: 'armors',
          inv_equip_staff: 'staffs',
          inv_equip_seal: 'seals'
        };
        const equipKeyMap = {
          inv_equip_weapon: 'weapon',
          inv_equip_armor: 'armor',
          inv_equip_staff: 'staff',
          inv_equip_seal: 'seal'
        };

        const listKey = typeMap[action];
        const equipKey = equipKeyMap[action];
        const items = run.inventory?.[listKey] || [];

        if (items.length === 0) {
          return interaction.followUp({ content: 'Không có món nào để mặc.', flags: MessageFlags.Ephemeral });
        }

        const options = items.slice(0, 25).map((item, index) => ({
          label: item.name.slice(0, 100),
          description: (item.description || item.rarity || 'Trang bị').slice(0, 50),
          value: String(index)
        }));

        const select = new StringSelectMenuBuilder()
          .setCustomId(`inv_select:${equipKey}`)
          .setPlaceholder(`Chọn ${equipKey} để mặc`)
          .addOptions(options);

        const row = new ActionRowBuilder().addComponents(select);
        await interaction.editReply({ content: `Chọn **${equipKey}** bạn muốn mặc:`, embeds: [], components: [row] });
        return;
      }

      if (action === 'inv_unequip') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run) return;

        run.inventory.equipped = { weapon: null, armor: null, staff: null, seal: null };
        applyEquipmentStats(run);
        run.markModified('inventory');
        await run.save();

        const embed = createInventoryEmbed(run);
        const components = createInventoryComponents(run);
        await interaction.editReply({ content: 'Đã tháo toàn bộ trang bị.', embeds: [embed], components });
        return;
      }

      if (action === 'inv_close') {
        await interaction.editReply({ content: 'Đã đóng túi đồ.', embeds: [], components: [] });
        return;
      }

      // ---------- Relic ----------
      if (action === 'relic_equip') {
        const user = await User.findOne({ discordId: interaction.user.id });
        if (!user) return;

        const unequipped = user.relics.filter(r => !r.equipped);
        if (unequipped.length === 0) {
          return interaction.followUp({ content: 'Không còn Relic để trang bị.', flags: MessageFlags.Ephemeral });
        }

        const equippedCount = user.relics.filter(r => r.equipped).length;
        if (equippedCount >= 3) {
          return interaction.followUp({ content: 'Bạn đã trang bị tối đa 3 Relic.', flags: MessageFlags.Ephemeral });
        }

        const options = unequipped.slice(0, 25).map((r, index) => ({
          label: r.name.slice(0, 100),
          description: r.rarity,
          value: String(index)
        }));

        const select = new StringSelectMenuBuilder()
          .setCustomId('relic_select_equip')
          .setPlaceholder('Chọn Relic để trang bị')
          .addOptions(options);

        await interaction.editReply({
          content: 'Chọn Relic bạn muốn trang bị:',
          embeds: [],
          components: [new ActionRowBuilder().addComponents(select)]
        });
        return;
      }

      if (action === 'relic_unequip') {
        const user = await User.findOne({ discordId: interaction.user.id });
        if (!user) return;

        user.relics.forEach(r => (r.equipped = false));
        await user.save();
        await interaction.editReply({ content: 'Đã tháo toàn bộ Relic.', embeds: [], components: [] });
        return;
      }

      // ---------- Chọn Nightlord ----------
      if (action === 'select_nightlord') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run || run.currentPhase !== 'select_nightlord') {
          return interaction.followUp({ content: 'Run không hợp lệ hoặc đã chọn Nightlord rồi.', flags: MessageFlags.Ephemeral });
        }

        const nightlord = nightlords[value];
        if (!nightlord) {
          return interaction.followUp({ content: 'Nightlord không tồn tại.', flags: MessageFlags.Ephemeral });
        }

        run.nightlord = value;
        run.currentPhase = 'select_character';
        await run.save();

        let user = await User.findOne({ discordId: interaction.user.id });
        if (!user) {
          return interaction.editReply({ content: 'Không tìm thấy user.', embeds: [], components: [] });
        }

        const validCharacters = ['wylder', 'recluse', 'ironfist', 'seer'];
        user.unlockedCharacters = validCharacters;
        await user.save();

        const characterButtons = validCharacters.map(charId => {
          const char = characters[charId];
          return new ButtonBuilder()
            .setCustomId(`select_character:${charId}`)
            .setLabel(char.name)
            .setStyle(ButtonStyle.Primary);
        });

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
        return;
      }

      // ---------- Chọn Character ----------
      if (action === 'select_character') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run || run.currentPhase !== 'select_character') {
          return interaction.followUp({ content: 'Run không hợp lệ hoặc đã chọn nhân vật rồi.', flags: MessageFlags.Ephemeral });
        }

        const char = characters[value];
        if (!char) {
          return interaction.followUp({ content: 'Nhân vật không tồn tại.', flags: MessageFlags.Ephemeral });
        }

        applyCharacterToRun(run, value);
        run.currentPhase = 'exploring';
        await run.save();

        const choices = generateLocationChoices(3);
        const locationButtons = choices.map(loc =>
          new ButtonBuilder()
            .setCustomId(`select_location:${loc.id}`)
            .setLabel(`${loc.emoji} ${loc.name}`)
            .setStyle(ButtonStyle.Secondary)
        );

        const row = new ActionRowBuilder().addComponents(locationButtons);
        const nightlordName = nightlords[run.nightlord]?.name || run.nightlord;

        const embed = new EmbedBuilder()
          .setTitle('Bắt đầu khám phá')
          .setDescription(`Bạn sẽ đối đầu với **${nightlordName}** bằng **${char.name}**.\n\nHãy chọn địa điểm muốn đi:`)
          .setColor(0x57F287)
          .addFields(
            { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
            { name: 'Mana', value: `${run.mana}/${run.maxMana}`, inline: true },
            { name: 'Level', value: `${run.level}`, inline: true },
            { name: 'Location đã đi', value: `0`, inline: true }
          );

        await interaction.editReply({ embeds: [embed], components: [row] });
        return;
      }

      // ---------- Chọn Location ----------
      if (action === 'select_location') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run || run.currentPhase !== 'exploring') {
          return interaction.followUp({ content: 'Bạn không ở trong giai đoạn khám phá.', flags: MessageFlags.Ephemeral });
        }

        const selectedId = value;
        const selected = locations[selectedId];
        if (!selected) {
          return interaction.followUp({ content: 'Địa điểm không hợp lệ.', flags: MessageFlags.Ephemeral });
        }

        const result = await handleLocation(run, selectedId);

        run.locationsVisited += 1;
        run.locationHistory.push(selectedId);

        if (result.updates) {
          if (result.updates.hp !== undefined) run.hp = result.updates.hp;
          if (result.updates.mana !== undefined) run.mana = result.updates.mana;
          if (result.updates.runes !== undefined) run.runes = result.updates.runes;
        }

        if (result.isGrace) {
          run.hp = run.maxHp;
          run.mana = run.maxMana;
        }

        const special = getSpecialEvent(run.locationsVisited);
        if (special === 'miniboss1') run.currentPhase = 'miniboss1';
        else if (special === 'miniboss2') run.currentPhase = 'miniboss2';

        await run.save();

        // Site of Grace
        if (result.isGrace) {
          const levelUpCost = result.levelUpCost || run.level * 100;
          const canLevelUp = run.runes >= levelUpCost;

          const buttons = [];
          if (canLevelUp) {
            buttons.push(
              new ButtonBuilder()
                .setCustomId('grace_levelup')
                .setLabel(`Lên cấp (${levelUpCost} Rune)`)
                .setStyle(ButtonStyle.Success)
            );
          }
          buttons.push(
            new ButtonBuilder()
              .setCustomId('grace_continue')
              .setLabel('Tiếp tục khám phá')
              .setStyle(ButtonStyle.Primary)
          );

          const embed = new EmbedBuilder()
            .setTitle(`${selected.emoji} ${selected.name}`)
            .setDescription(result.message)
            .setColor(0xF1C40F)
            .addFields(
              { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
              { name: 'Mana', value: `${run.mana}/${run.maxMana}`, inline: true },
              { name: 'Level', value: `${run.level}`, inline: true },
              { name: 'Runes', value: `${run.runes}`, inline: true },
              { name: 'Location đã đi', value: `${run.locationsVisited}`, inline: true }
            );

          return interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(buttons)] });
        }

        // Shop
        if (result.isShop) {
          const embed = createShopEmbed(run);
          const components = createShopButtons();
          return interaction.editReply({ embeds: [embed], components });
        }

        // Miniboss
        if (special === 'miniboss1' || special === 'miniboss2') {
          const bossTemplate = getMiniboss(special);
          const combat = {
            enemy: {
              id: bossTemplate.id,
              name: bossTemplate.name,
              emoji: bossTemplate.emoji,
              currentHp: bossTemplate.hp,
              maxHp: bossTemplate.hp,
              damage: bossTemplate.damage,
              damageType: bossTemplate.damageType,
              resistances: bossTemplate.resistances,
              canApply: bossTemplate.canApply,
              runeReward: bossTemplate.runeReward,
              status: {}
            },
            turn: 1,
            playerStatus: {},
            log: [`⚠️ **MINIBOSS**\n${bossTemplate.emoji} **${bossTemplate.name}**\n${bossTemplate.description}`],
            isAuto: false,
            isMiniboss: true,
            minibossType: special
          };

          run.combat = combat;
          run.currentPhase = special;
          run.markModified('combat');
          await run.save();

          const embed = createCombatEmbed(run, combat);
          return interaction.editReply({
            content: `⚠️ Bạn đã gặp **${bossTemplate.name}**!`,
            embeds: [embed],
            components: createCombatButtons(run, false)
          });
        }

        // Combat thường
        if (result.isCombat || result.startCombat) {
          const combat = createCombatState(run, selectedId);
          run.combat = combat;
          run.markModified('combat');
          await run.save();

          const embed = createCombatEmbed(run, combat);
          return interaction.editReply({ embeds: [embed], components: createCombatButtons(run, false) });
        }
      }

      // ---------- Shop Buy ----------
      if (action === 'shop_buy') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run) {
          return interaction.followUp({ content: 'Không tìm thấy run.', flags: MessageFlags.Ephemeral });
        }

        const result = await buyItem(run, parseInt(value));
        await run.save();

        if (!result.success) {
          return interaction.followUp({ content: result.message, flags: MessageFlags.Ephemeral });
        }

        const embed = createShopEmbed(run);
        embed.setDescription(`${result.message}\n\nRune còn lại: **${run.runes}**\n\nChọn vật phẩm tiếp theo hoặc rời cửa hàng:`);
        await interaction.editReply({ embeds: [embed], components: createShopButtons() });
        return;
      }

      // ---------- Shop Leave ----------
      if (action === 'shop_leave') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run) return;

        const nextChoices = generateLocationChoices(3);
        const nextButtons = nextChoices.map(loc =>
          new ButtonBuilder()
            .setCustomId(`select_location:${loc.id}`)
            .setLabel(`${loc.emoji} ${loc.name}`)
            .setStyle(ButtonStyle.Secondary)
        );

        const embed = new EmbedBuilder()
          .setTitle('Rời cửa hàng')
          .setDescription('Bạn đã rời cửa hàng.\nHãy chọn địa điểm tiếp theo:')
          .setColor(0x3498DB)
          .addFields(
            { name: 'Location đã đi', value: `${run.locationsVisited}`, inline: true },
            { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
            { name: 'Mana', value: `${run.mana}/${run.maxMana}`, inline: true },
            { name: 'Runes', value: `${run.runes}`, inline: true }
          );

        await interaction.editReply({
          embeds: [embed],
          components: [new ActionRowBuilder().addComponents(nextButtons)]
        });
        return;
      }

      // ---------- Grace Level Up ----------
      if (action === 'grace_levelup') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run) return;

        const levelUpCost = run.level * 100;
        if (run.runes < levelUpCost) {
          return interaction.followUp({ content: 'Không đủ Rune để lên cấp!', flags: MessageFlags.Ephemeral });
        }

        run.runes -= levelUpCost;
        run.level += 1;

        const newStats = calculateStats(run.character, run.level);
        run.stats = newStats;
        run.maxHp = calculateMaxHp(newStats.vigor);
        run.maxMana = calculateMaxMana(newStats.mind);
        run.hp = run.maxHp;
        run.mana = run.maxMana;
        await run.save();

        const embed = new EmbedBuilder()
          .setTitle('✨ Lên cấp thành công!')
          .setDescription(`Bạn đã lên **Level ${run.level}**!`)
          .setColor(0x2ECC71)
          .addFields(
            { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
            { name: 'Mana', value: `${run.mana}/${run.maxMana}`, inline: true },
            { name: 'Runes còn lại', value: `${run.runes}`, inline: true }
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('grace_continue').setLabel('Tiếp tục khám phá').setStyle(ButtonStyle.Primary)
        );

        await interaction.editReply({ embeds: [embed], components: [row] });
        return;
      }

      // ---------- Grace / Shop Continue ----------
      if (action === 'grace_continue' || action === 'shop_continue') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run || run.currentPhase !== 'exploring') return;

        const nextChoices = generateLocationChoices(3);
        const nextButtons = nextChoices.map(loc =>
          new ButtonBuilder()
            .setCustomId(`select_location:${loc.id}`)
            .setLabel(`${loc.emoji} ${loc.name}`)
            .setStyle(ButtonStyle.Secondary)
        );

        const embed = new EmbedBuilder()
          .setTitle('Tiếp tục hành trình')
          .setDescription('Hãy chọn địa điểm tiếp theo:')
          .setColor(0x3498DB)
          .addFields(
            { name: 'Location đã đi', value: `${run.locationsVisited}`, inline: true },
            { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
            { name: 'Mana', value: `${run.mana}/${run.maxMana}`, inline: true },
            { name: 'Level', value: `${run.level}`, inline: true },
            { name: 'Runes', value: `${run.runes}`, inline: true }
          );

        await interaction.editReply({
          embeds: [embed],
          components: [new ActionRowBuilder().addComponents(nextButtons)]
        });
        return;
      }

      // ---------- Reward ----------
      if (action === 'reward') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run || !run.tempRewards || run.tempRewards.length === 0) {
          return interaction.followUp({ content: 'Không tìm thấy phần thưởng.', flags: MessageFlags.Ephemeral });
        }

        const index = parseInt(value);
        const chosen = run.tempRewards[index];
        if (!chosen) {
          return interaction.followUp({ content: 'Lựa chọn không hợp lệ.', flags: MessageFlags.Ephemeral });
        }

        let resultMsg = '';

        if (chosen.type === 'equipment') {
          if (!run.inventory) {
            run.inventory = { weapons: [], armors: [], staffs: [], seals: [], consumables: [], equipped: {} };
          }
          const eq = chosen.data;
          if (eq.type === 'weapon') run.inventory.weapons.push(eq);
          else if (eq.type === 'armor') run.inventory.armors.push(eq);
          else if (eq.type === 'staff') run.inventory.staffs.push(eq);
          else if (eq.type === 'seal') run.inventory.seals.push(eq);

          resultMsg = `Bạn đã nhận: **${eq.name}**`;
          if (eq.spells) resultMsg += `\nSpell: ${eq.spells.map(s => s.name).join(' + ')}`;
        }

        if (chosen.type === 'buff') {
          const buff = chosen.data;
          run.stats[buff.stat] = (run.stats[buff.stat] || 0) + buff.value;
          if (buff.stat === 'vigor') {
            run.maxHp = calculateMaxHp(run.stats.vigor);
            run.hp = Math.min(run.hp, run.maxHp);
          }
          if (buff.stat === 'mind') {
            run.maxMana = calculateMaxMana(run.stats.mind);
            run.mana = Math.min(run.mana, run.maxMana);
          }
          resultMsg = `Bạn đã nhận buff: **${buff.name}**`;
        }

        run.tempRewards = undefined;

        if (run.currentPhase === 'rest') {
          await run.save();
          const embed = new EmbedBuilder()
            .setTitle('🏕️ Rest Area')
            .setDescription('Bạn đã đánh bại Miniboss 2.\nHãy nghỉ ngơi và chuẩn bị đối đầu với **Nightlord**.')
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

        await run.save();

        const nextChoices = generateLocationChoices(3);
        const nextButtons = nextChoices.map(loc =>
          new ButtonBuilder()
            .setCustomId(`select_location:${loc.id}`)
            .setLabel(`${loc.emoji} ${loc.name}`)
            .setStyle(ButtonStyle.Secondary)
        );

        const embed = new EmbedBuilder()
          .setTitle('Đã chọn phần thưởng!')
          .setDescription(`${resultMsg}\n\nHãy chọn địa điểm tiếp theo:`)
          .setColor(0x2ECC71)
          .addFields(
            { name: 'Location đã đi', value: `${run.locationsVisited}`, inline: true },
            { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
            { name: 'Mana', value: `${run.mana}/${run.maxMana}`, inline: true },
            { name: 'Runes', value: `${run.runes}`, inline: true },
            { name: 'Level', value: `${run.level}`, inline: true }
          );

        await interaction.editReply({
          embeds: [embed],
          components: [new ActionRowBuilder().addComponents(nextButtons)]
        });
        return;
      }

      // ---------- Rest Area ----------
      if (action === 'rest_heal') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run || run.currentPhase !== 'rest') return;

        run.hp = run.maxHp;
        run.mana = run.maxMana;
        await run.save();

        const embed = new EmbedBuilder()
          .setTitle('🏕️ Rest Area')
          .setDescription('Bạn đã hồi đầy HP và Mana.')
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

        await interaction.editReply({ embeds: [embed], components: [row] });
        return;
      }

      if (action === 'rest_levelup') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run || run.currentPhase !== 'rest') return;

        const levelUpCost = run.level * 100;
        if (run.runes < levelUpCost) {
          return interaction.followUp({ content: `Không đủ Rune! Cần ${levelUpCost}.`, flags: MessageFlags.Ephemeral });
        }

        run.runes -= levelUpCost;
        run.level += 1;
        const newStats = calculateStats(run.character, run.level);
        run.stats = newStats;
        run.maxHp = calculateMaxHp(newStats.vigor);
        run.maxMana = calculateMaxMana(newStats.mind);
        run.hp = run.maxHp;
        run.mana = run.maxMana;
        await run.save();

        const embed = new EmbedBuilder()
          .setTitle('✨ Lên cấp thành công!')
          .setDescription(`Bạn đã lên **Level ${run.level}**!`)
          .setColor(0x2ECC71)
          .addFields(
            { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
            { name: 'Mana', value: `${run.mana}/${run.maxMana}`, inline: true },
            { name: 'Runes còn lại', value: `${run.runes}`, inline: true }
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('rest_heal').setLabel('Hồi đầy HP/Mana').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('rest_levelup').setLabel('Lên cấp').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('rest_fight_nightlord').setLabel('Khiêu chiến Nightlord').setStyle(ButtonStyle.Danger)
        );

        await interaction.editReply({ embeds: [embed], components: [row] });
        return;
      }

      if (action === 'rest_fight_nightlord') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run || run.currentPhase !== 'rest') return;

        const boss = nightlords[run.nightlord];
        if (!boss) {
          return interaction.followUp({ content: 'Không tìm thấy Nightlord.', flags: MessageFlags.Ephemeral });
        }

        const combat = {
          enemy: {
            id: boss.id,
            name: boss.name,
            emoji: boss.emoji || '🌑',
            currentHp: boss.hp,
            maxHp: boss.hp,
            damage: boss.damage,
            damageType: boss.damageType,
            resistances: boss.resistances || {},
            canApply: boss.canApply || null,
            runeReward: boss.runeReward || [600, 900],
            status: {}
          },
          turn: 1,
          playerStatus: {},
          log: [`🌑 **NIGHTLORD**\n${boss.emoji || '🌑'} **${boss.name}**\n${boss.description}`],
          isAuto: false,
          isNightlord: true
        };

        run.combat = combat;
        run.currentPhase = 'nightlord';
        run.markModified('combat');
        await run.save();

        const embed = createCombatEmbed(run, combat);
        await interaction.editReply({
          content: `🌑 **Khiêu chiến ${boss.name}!**`,
          embeds: [embed],
          components: createCombatButtons(run, false)
        });
        return;
      }

      // ---------- Combat (Attack / Skill / Ultimate / Spell / Auto) ----------
      // Giữ nguyên logic combat bạn đang dùng.
      // Quan trọng: mọi chỗ gọi createCombatButtons phải là createCombatButtons(run, false)

      if (action === 'combat_attack' || action === 'combat_skill' || action === 'combat_ultimate' || action === 'combat_spell') {
        // Bạn giữ nguyên phần combat logic đã viết trước đó.
        // Chỉ cần đảm bảo không gọi deferUpdate() thêm lần nữa.
        return;
      }

      if (action === 'combat_auto' || action === 'combat_stop_auto') {
        // Giữ nguyên logic auto combat đã viết.
        return;
      }

    } catch (error) {
      console.error('Button error:', error);
      try {
        await interaction.followUp({ content: 'Đã xảy ra lỗi khi xử lý lựa chọn.', flags: MessageFlags.Ephemeral });
      } catch (_) {}
    }
  }
};