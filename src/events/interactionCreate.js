const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const nightlords = require('../data/nightlords');
const characters = require('../data/characters');
const Run = require('../models/Run');
const User = require('../models/User');
const { applyCharacterToRun, calculateStats, calculateMaxHp, calculateMaxMana } = require('../systems/characterSystem');
const { generateLocationChoices, getSpecialEvent, handleLocation, locations } = require('../systems/locationSystem');
const { generateRewards, createRewardEmbed } = require('../systems/rewardSystem');
const { applyEquipmentStats, createInventoryEmbed, createInventoryComponents } = require('../systems/inventorySystem');

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
        const msg = { content: 'Có lỗi xảy ra khi thực hiện lệnh này.', ephemeral: true };
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
      const [action, value] = interaction.customId.split(':');

      try {
        await interaction.deferUpdate();
      } catch {
        return;
      }

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
            return interaction.followUp({ content: 'Món đồ không tồn tại.', ephemeral: true });
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
      } catch (error) {
        console.error('SelectMenu error:', error);
      }
      return;
    }

    // ====================== BUTTON ======================
    if (!interaction.isButton()) return;

    const [action, value] = interaction.customId.split(':');

    try {
      await interaction.deferUpdate();
    } catch {
      return;
    }

    try {
      // ---------- Inventory Buttons ----------
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
          return interaction.followUp({ content: 'Không có món nào để mặc.', ephemeral: true });
        }

        const options = items.slice(0, 25).map((item, index) => ({
          label: item.name.slice(0, 100),
          description: (item.desc || item.rarity || 'Trang bị').slice(0, 50),
          value: String(index)
        }));

        const select = new StringSelectMenuBuilder()
          .setCustomId(`inv_select:${equipKey}`)
          .setPlaceholder(`Chọn ${equipKey} để mặc`)
          .addOptions(options);

        const row = new ActionRowBuilder().addComponents(select);

        await interaction.editReply({
          content: `Chọn **${equipKey}** bạn muốn mặc:`,
          embeds: [],
          components: [row]
        });
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

        await interaction.editReply({
          content: 'Đã tháo toàn bộ trang bị.',
          embeds: [embed],
          components
        });
        return;
      }

      if (action === 'inv_close') {
        await interaction.editReply({ content: 'Đã đóng túi đồ.', embeds: [], components: [] });
        return;
      }

      // ---------- Chọn Nightlord ----------
      if (action === 'select_nightlord') {
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

      // ---------- Dùng Spell ----------
if (action === 'combat_spell') {
  const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
  if (!run || !run.combat) {
    return interaction.followUp({ content: 'Không có trận đấu nào đang diễn ra.', ephemeral: true });
  }

  const spellIndex = parseInt(value); // 0 hoặc 1
  const staff = run.inventory?.equipped?.staff;
  const seal = run.inventory?.equipped?.seal;

  let spell = null;
  if (staff?.spells?.[spellIndex]) spell = staff.spells[spellIndex];
  else if (seal?.spells?.[spellIndex]) spell = seal.spells[spellIndex];

  if (!spell) {
    return interaction.followUp({ content: 'Spell không tồn tại.', ephemeral: true });
  }

  const {
    calculateSpellDamage,
    calculateEnemyDamage,
    applyResistance,
    tryDodge,
    processStatusEffects,
    createCombatEmbed,
    createCombatButtons
  } = require('../systems/combatSystem');

  let log = run.combat.log || [];
  let playerDied = false;
  let enemyDied = false;
  const enemy = run.combat.enemy;

  // 1. Status effect người chơi
  const playerStatusResult = processStatusEffects({ status: run.combat.playerStatus });
  if (playerStatusResult.damage > 0) {
    run.hp -= playerStatusResult.damage;
    log.push(...playerStatusResult.messages.map(m => `Bạn: ${m}`));
    if (run.hp <= 0) {
      run.hp = 0;
      playerDied = true;
    }
  }

  if (playerDied) {
    const { handleRunDefeat } = require('../systems/combatSystem');
    const embed = await handleRunDefeat(run, interaction, log);
    return interaction.editReply({ embeds: [embed], components: [] });
  }

  // 2. Kiểm tra mana
  if (run.mana < spell.manaCost) {
    log.push(`❌ Không đủ Mana để dùng **${spell.name}**!`);
    run.combat.log = log;
    run.markModified('combat');
    await run.save();

    const embed = createCombatEmbed(run, run.combat);
    return interaction.editReply({ embeds: [embed], components: createCombatButtons(run, false) });
  }

  run.mana -= spell.manaCost;

  // 3. Gây sát thương spell
  const dmgInfo = calculateSpellDamage(run, spell);
  let finalDamage = applyResistance(dmgInfo.amount, dmgInfo.type, enemy.resistances || {});

  if (Math.random() < 0.07) {
    log.push(`💨 ${enemy.name} đã né **${spell.name}**!`);
  } else {
    enemy.currentHp -= finalDamage;
    log.push(`✨ Bạn dùng **${spell.name}** gây **${finalDamage}** sát thương ${dmgInfo.type}!`);
  }

  if (enemy.currentHp <= 0) {
    enemy.currentHp = 0;
    enemyDied = true;
  }

  // 4. Địch đánh lại
  if (!enemyDied) {
    const enemyStatusResult = processStatusEffects(enemy);
    if (enemyStatusResult.damage > 0) {
      enemy.currentHp -= enemyStatusResult.damage;
      log.push(...enemyStatusResult.messages.map(m => `${enemy.name}: ${m}`));
      if (enemy.currentHp <= 0) {
        enemy.currentHp = 0;
        enemyDied = true;
      }
    }

    if (!enemyDied) {
      if (tryDodge(run)) {
        log.push(`💨 Bạn né được đòn của ${enemy.name}!`);
      } else {
        let enemyDmg = calculateEnemyDamage(enemy, run);
        const playerResist = {
          physical: (run.stats?.strength || 10) * 0.8,
          fire: (run.stats?.vigor || 10) * 0.6,
          magic: (run.stats?.intelligence || 10) * 0.7,
          lightning: (run.stats?.dexterity || 10) * 0.7,
          holy: (run.stats?.faith || 10) * 0.7
        };
        enemyDmg = applyResistance(enemyDmg, enemy.damageType, playerResist);
        run.hp -= enemyDmg;
        log.push(`💥 ${enemy.name} gây **${enemyDmg}** sát thương!`);

        if (run.hp <= 0) {
          run.hp = 0;
          playerDied = true;
        }
      }
    }
  }

  // 5. Cập nhật
  run.combat.turn += 1;
  run.combat.log = log.slice(-15);
  run.combat.enemy = enemy;
  run.markModified('combat');

  if (playerDied) {
    const { handleRunDefeat } = require('../systems/combatSystem');
    const embed = await handleRunDefeat(run, interaction, log);
    return interaction.editReply({ embeds: [embed], components: [] });
  }

  if (enemyDied) {
    // Xử lý thắng (giống các nút khác)
    const gainedRunes = Math.floor(Math.random() * (enemy.runeReward[1] - enemy.runeReward[0] + 1)) + enemy.runeReward[0];
    run.runes = (run.runes || 0) + gainedRunes;
    run.combat = null;

    const { generateRewards, createRewardEmbed } = require('../systems/rewardSystem');
    const rewards = generateRewards(1);
    run.tempRewards = rewards;
    run.markModified('tempRewards');
    await run.save();

    const { embed, row } = createRewardEmbed(run, `${enemy.emoji} ${enemy.name}`, rewards, gainedRunes);
    return interaction.editReply({
      content: `🎉 **Chiến thắng!** +${gainedRunes} Rune`,
      embeds: [embed],
      components: [row]
    });
  }

  await run.save();
  const embed = createCombatEmbed(run, run.combat);
  await interaction.editReply({ embeds: [embed], components: createCombatButtons(run, false) });
  return;
}

      // ---------- Chọn Character ----------
      if (action === 'select_character') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });

        if (!run || run.currentPhase !== 'select_character') {
          return interaction.followUp({ content: 'Run không hợp lệ hoặc đã chọn nhân vật rồi.', ephemeral: true });
        }

        const char = characters[value];
        if (!char) {
          return interaction.followUp({ content: 'Nhân vật không tồn tại.', ephemeral: true });
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
          return interaction.followUp({ content: 'Bạn không ở trong giai đoạn khám phá.', ephemeral: true });
        }

        const selectedId = value;
        const selected = locations[selectedId];
        if (!selected) {
          return interaction.followUp({ content: 'Địa điểm không hợp lệ.', ephemeral: true });
        }

        const result = await handleLocation(run, selectedId);

        run.locationsVisited += 1;
run.locationHistory.push(selectedId);

// Áp dụng updates
if (result.updates) {
  if (result.updates.hp !== undefined) run.hp = result.updates.hp;
  if (result.updates.mana !== undefined) run.mana = result.updates.mana;
  if (result.updates.runes !== undefined) run.runes = result.updates.runes;
}

// Đặc biệt với Site of Grace → ép hồi đầy lần nữa cho chắc
if (result.isGrace) {
  run.hp = run.maxHp;
  run.mana = run.maxMana;
}

        const special = getSpecialEvent(run.locationsVisited);
        // ===== MINIBOSS =====
if (special === 'miniboss1' || special === 'miniboss2') {
  const { createCombatState, createCombatEmbed, createCombatButtons } = require('../systems/combatSystem');
  const { getMiniboss } = require('../systems/locationSystem');

  const bossTemplate = getMiniboss(special);

  // Tạo combat state đặc biệt cho Miniboss
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
    log: [`⚠️ **MINIBOSS** xuất hiện!\n${bossTemplate.emoji} **${bossTemplate.name}**\n${bossTemplate.description}`],
    isAuto: false,
    isMiniboss: true,
    minibossType: special,
    locationId: selectedId
  };

  run.combat = combat;
  run.currentPhase = special; // 'miniboss1' hoặc 'miniboss2'
  run.markModified('combat');
  await run.save();

  const embed = createCombatEmbed(run, combat);
  const components = createCombatButtons(run,false);

  return interaction.editReply({
    content: `⚠️ Bạn đã gặp **${bossTemplate.name}**!`,
    embeds: [embed],
    components
  });
}

        // Site of Grace
        if (result.isGrace) {
          const levelUpCost = result.levelUpCost;
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

          const row = new ActionRowBuilder().addComponents(buttons);

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

          return interaction.editReply({ embeds: [embed], components: [row] });
        }

        // ===== SHOP =====
if (result.isShop) {
  const { createShopEmbed, createShopButtons } = require('../systems/shopSystem');

  const embed = createShopEmbed(run);
  const components = createShopButtons();

  return interaction.editReply({ embeds: [embed], components });
}

// ---------- Shop: Mua vật phẩm ----------
if (action === 'shop_buy') {
  const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
  if (!run || run.currentPhase !== 'exploring') {
    return interaction.followUp({ content: 'Không thể mua lúc này.', ephemeral: true });
  }

  const itemIndex = parseInt(value);
  const { buyItem, createShopEmbed, createShopButtons } = require('../systems/shopSystem');

  const result = await buyItem(run, itemIndex);
  await run.save();

  if (!result.success) {
    return interaction.followUp({ content: result.message, ephemeral: true });
  }

  // Hiện lại shop sau khi mua
  const embed = createShopEmbed(run);
  embed.setDescription(`${result.message}\n\nRune còn lại: **${run.runes}**\n\nChọn vật phẩm tiếp theo hoặc rời cửa hàng:`);

  const components = createShopButtons();

  await interaction.editReply({ embeds: [embed], components });
  return;
}

// ---------- Shop: Rời cửa hàng ----------
if (action === 'shop_leave') {
  const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
  if (!run) return;

  const { generateLocationChoices } = require('../systems/locationSystem');
  const nextChoices = generateLocationChoices(3);

  const nextButtons = nextChoices.map(loc =>
    new ButtonBuilder()
      .setCustomId(`select_location:${loc.id}`)
      .setLabel(`${loc.emoji} ${loc.name}`)
      .setStyle(ButtonStyle.Secondary)
  );

  const row = new ActionRowBuilder().addComponents(nextButtons);

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

  await interaction.editReply({ embeds: [embed], components: [row] });
  return;
}

        // Miniboss
        if (special) {
          const embed = new EmbedBuilder()
            .setTitle(`${selected.emoji} ${selected.name}`)
            .setDescription(result.message + `\n\n⚠️ **Bạn đã đến mốc ${special.toUpperCase()}!**`)
            .setColor(0xE74C3C)
            .addFields(
              { name: 'Location đã đi', value: `${run.locationsVisited}`, inline: true },
              { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
              { name: 'Mana', value: `${run.mana}/${run.maxMana}`, inline: true },
              { name: 'Runes', value: `${run.runes}`, inline: true }
            )
            .setFooter({ text: 'Hệ thống Miniboss sẽ được làm ở phase sau' });

          return interaction.editReply({ embeds: [embed], components: [] });
        }

        // Combat location → Reward
        if (result.isCombat) {
          const { createCombatState, createCombatEmbed, createCombatButtons } = require('../systems/combatSystem');

          const combat = createCombatState(run, selectedId);
          run.combat = combat;
          run.markModified('combat');
          await run.save();

          const embed = createCombatEmbed(run, combat);
          const components = createCombatButtons(run, false);

          return interaction.editReply({ embeds: [embed], components });
        }
      }

      // ---------- Chọn Phần thưởng ----------
      if (action === 'reward') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run || !run.tempRewards || run.tempRewards.length === 0) {
          return interaction.followUp({ content: 'Không tìm thấy phần thưởng.', ephemeral: true });
        }

        const index = parseInt(value);
        const chosen = run.tempRewards[index];
        if (!chosen) {
          return interaction.followUp({ content: 'Lựa chọn không hợp lệ.', ephemeral: true });
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
  if (eq.spells) {
    resultMsg += `\nSpell: ${eq.spells.map(s => s.name).join(' + ')}`;
  }
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

          resultMsg = `Bạn đã nhận buff vĩnh viễn: **${buff.name}**`;
        }

        run.tempRewards = undefined;
        await run.save();

        const nextChoices = generateLocationChoices(3);
        const nextButtons = nextChoices.map(loc =>
          new ButtonBuilder()
            .setCustomId(`select_location:${loc.id}`)
            .setLabel(`${loc.emoji} ${loc.name}`)
            .setStyle(ButtonStyle.Secondary)
        );

        const row = new ActionRowBuilder().addComponents(nextButtons);

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

        await interaction.editReply({ embeds: [embed], components: [row] });
        return;
        // Sau khi nhận thưởng
if (run.currentPhase === 'rest') {
  // Hiện Rest Area
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
    new ButtonBuilder()
      .setCustomId('rest_heal')
      .setLabel('Hồi đầy HP/Mana')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('rest_levelup')
      .setLabel('Lên cấp')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('rest_fight_nightlord')
      .setLabel('Khiêu chiến Nightlord')
      .setStyle(ButtonStyle.Danger)
  );

  return interaction.editReply({ embeds: [embed], components: [row] });
}
      }

      // ====================== COMBAT BUTTONS ======================

if (action === 'combat_attack' || action === 'combat_skill' || action === 'combat_ultimate') {
  const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
  if (!run || !run.combat) {
    return interaction.followUp({ content: 'Không có trận đấu nào đang diễn ra.', ephemeral: true });
  }

  const combat = run.combat;
  const enemy = combat.enemy;
  const { 
    calculatePlayerDamage, calculateEnemyDamage, applyResistance, 
    tryDodge, processStatusEffects, createCombatEmbed, createCombatButtons 
  } = require('../systems/combatSystem');

  let log = combat.log || [];
  let playerDied = false;
  let enemyDied = false;

  // ===== 1. Xử lý status effect đầu lượt của người chơi =====
  const playerStatusResult = processStatusEffects({ status: combat.playerStatus }, true);
  if (playerStatusResult.damage > 0) {
    run.hp -= playerStatusResult.damage;
    log.push(...playerStatusResult.messages.map(m => `Bạn: ${m}`));
    if (run.hp <= 0) {
      run.hp = 0;
      playerDied = true;
    }
  }

  // Khi thua
// Thua
if (playerDied) {
  const { handleRunDefeat } = require('../systems/combatSystem');
  const embed = await handleRunDefeat(run, interaction, log);

  return interaction.editReply({ 
    content: null, 
    embeds: [embed], 
    components: [] 
  });
}

  // ===== 2. Người chơi hành động =====
  let actionName = '';
  let manaCost = 0;
  let skillType = 'weapon';

  if (action === 'combat_attack') {
    actionName = 'Tấn công';
    skillType = 'weapon';
  } else if (action === 'combat_skill') {
    actionName = 'Skill';
    skillType = 'skill';
    manaCost = 18;
  } else if (action === 'combat_ultimate') {
    actionName = 'Ultimate';
    skillType = 'ultimate';
    manaCost = 40;
  }

  if (run.mana < manaCost) {
    log.push(`❌ Không đủ Mana để dùng ${actionName}!`);
    combat.log = log;
    run.markModified('combat');
    await run.save();

    const embed = createCombatEmbed(run, combat);
    return interaction.editReply({ embeds: [embed], components: createCombatButtons(run, false) });
  }

  run.mana -= manaCost;

  // Tính sát thương
  const dmgInfo = calculatePlayerDamage(run, skillType);
  let finalDamage = applyResistance(dmgInfo.amount, dmgInfo.type, enemy.resistances);

  // Kiểm tra địch có né không (tạm để thấp)
  const enemyDodge = Math.random() < 0.08;
  if (enemyDodge) {
    log.push(`💨 ${enemy.name} đã né tránh đòn ${actionName}!`);
  } else {
    enemy.currentHp -= finalDamage;
    log.push(`⚔️ Bạn dùng **${actionName}** gây **${finalDamage}** sát thương ${dmgInfo.type}!`);
  }

  if (enemy.currentHp <= 0) {
    enemy.currentHp = 0;
    enemyDied = true;
  }

  // ===== 3. Nếu địch còn sống → địch đánh lại =====
  if (!enemyDied) {
    // Status effect của địch
    const enemyStatusResult = processStatusEffects(enemy);
    if (enemyStatusResult.damage > 0) {
      enemy.currentHp -= enemyStatusResult.damage;
      log.push(...enemyStatusResult.messages.map(m => `${enemy.name}: ${m}`));
      if (enemy.currentHp <= 0) {
        enemy.currentHp = 0;
        enemyDied = true;
      }
    }

    if (!enemyDied) {
      // Địch tấn công
      if (tryDodge(run)) {
        log.push(`💨 Bạn đã **né** đòn tấn công của ${enemy.name}!`);
      } else {
        let enemyDmg = calculateEnemyDamage(enemy, run);
        // Kháng của người chơi (tạm tính đơn giản)
        const playerResist = {
          physical: run.stats.strength * 0.8,
          fire: run.stats.vigor * 0.6,
          magic: run.stats.intelligence * 0.7,
          lightning: run.stats.dexterity * 0.7,
          holy: run.stats.faith * 0.7
        };
        enemyDmg = applyResistance(enemyDmg, enemy.damageType, playerResist);

        run.hp -= enemyDmg;
        log.push(`💥 ${enemy.name} gây **${enemyDmg}** sát thương ${enemy.damageType} lên bạn!`);

        // Có chance gây status
        if (enemy.canApply && Math.random() < 0.35) {
          if (!combat.playerStatus) combat.playerStatus = {};
          combat.playerStatus[enemy.canApply] = (combat.playerStatus[enemy.canApply] || 0) + 2;
          log.push(`⚠️ Bạn bị dính **${enemy.canApply}**!`);
        }

        if (run.hp <= 0) {
          run.hp = 0;
          playerDied = true;
        }
      }
    }
  }

  // ===== 4. Kết thúc lượt =====
  combat.turn += 1;
  combat.log = log.slice(-12); // giữ log gọn
  combat.enemy = enemy;

  // Thua
  if (playerDied) {
    run.combat = null;
    run.status = 'failed';
    run.currentPhase = 'ended';
    await run.save();

    const embed = new EmbedBuilder()
      .setTitle('💀 Bạn đã thất bại')
      .setDescription(log.slice(-8).join('\n') + '\n\n**Run kết thúc.**')
      .setColor(0x7F8C8D);

    return interaction.editReply({ embeds: [embed], components: [] });
  }

 // Thắng
if (enemy.currentHp <= 0) {
  const isNightlord = run.combat?.isNightlord;
  const isMiniboss = run.combat?.isMiniboss;
  const gainedRunes = Math.floor(
    Math.random() * (enemy.runeReward[1] - enemy.runeReward[0] + 1)
  ) + enemy.runeReward[0];

  run.runes = (run.runes || 0) + gainedRunes;
  run.combat = null;

  if (isNightlord) {
    // ===== THẮNG NIGHTLORD → KẾT THÚC RUN =====
    run.status = 'completed';
    run.currentPhase = 'ended';

    // Tính Murk (tạm thời)
    const murkGained = 80 + run.locationsVisited * 2 + run.level * 3;
    
    // Cộng Murk cho user
    await User.findOneAndUpdate(
      { discordId: interaction.user.id },
      { 
        $inc: { murk: murkGained, wins: 1, totalRuns: 1 },
        lastActive: new Date()
      }
    );

    await run.save();

    const embed = new EmbedBuilder()
      .setTitle('🎉 CHIẾN THẮNG NIGHTLORD!')
      .setDescription(`Bạn đã đánh bại **${enemy.name}**!\n\nRun hoàn thành xuất sắc.`)
      .setColor(0xF1C40F)
      .addFields(
        { name: 'Rune nhận được', value: `${gainedRunes}`, inline: true },
        { name: 'Murk nhận được', value: `${murkGained}`, inline: true },
        { name: 'Level cuối', value: `${run.level}`, inline: true },
        { name: 'Location đã đi', value: `${run.locationsVisited}`, inline: true }
      )
      .setFooter({ text: 'Dùng /profile để xem Murk. Hệ thống Gacha Relic sẽ được làm sau.' });

    return interaction.editReply({ embeds: [embed], components: [] });
  }

  // Thắng Miniboss hoặc enemy thường → phần thưởng như cũ
  const lootTier = isMiniboss ? 2 : 1;
  const { generateRewards, createRewardEmbed } = require('../systems/rewardSystem');
  const rewards = generateRewards(lootTier);

  run.tempRewards = rewards;

  if (run.currentPhase === 'miniboss2') {
    run.currentPhase = 'rest';
  } else {
    run.currentPhase = 'exploring';
  }

  run.markModified('tempRewards');
  await run.save();

  const { embed, row } = createRewardEmbed(run, `${enemy.emoji} ${enemy.name}`, rewards, gainedRunes);

  return interaction.editReply({
    content: `🎉 **Chiến thắng${isMiniboss ? ' MINIBOSS' : ''}!** +${gainedRunes} Rune`,
    embeds: [embed],
    components: [row]
  });
}

  // Còn chiến đấu tiếp
  run.combat = combat;
  run.markModified('combat');
  await run.save();

  const embed = createCombatEmbed(run, combat);
  await interaction.editReply({ embeds: [embed], components: createCombatButtons(run, false) });
  return;
}

// ---------- Auto Combat ----------
if (action === 'combat_auto') {
  const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
  if (!run || !run.combat) {
    return interaction.followUp({ content: 'Không có trận đấu nào đang diễn ra.', ephemeral: true });
  }

  const {
    calculatePlayerDamage,
    calculateEnemyDamage,
    applyResistance,
    tryDodge,
    processStatusEffects,
    createCombatEmbed,
    createCombatButtons,
    runAutoTurn
  } = require('../systems/combatSystem');

  run.combat.isAuto = true;
  let log = run.combat.log || [];
  let safety = 0;
  const maxTurns = 20; // giới hạn an toàn

  // Chạy auto đến khi thắng / thua / hết lượt an toàn
  while (run.combat?.isAuto && safety < maxTurns) {
    safety++;

    const enemy = run.combat.enemy;
    let playerDied = false;
    let enemyDied = false;

    // 1. Status effect người chơi
    const playerStatusResult = processStatusEffects({ status: run.combat.playerStatus });
    if (playerStatusResult.damage > 0) {
      run.hp -= playerStatusResult.damage;
      log.push(...playerStatusResult.messages.map(m => `Bạn: ${m}`));
      if (run.hp <= 0) {
        run.hp = 0;
        playerDied = true;
      }
    }

    if (playerDied) break;

    // 2. Quyết định hành động
    const nextAction = runAutoTurn(run); // 'combat_attack' | 'combat_skill' | 'combat_ultimate'
    let actionType = 'attack';
    let actionName = 'Tấn công';
    let manaCost = 0;

    if (nextAction === 'combat_skill') {
      actionType = 'skill';
      actionName = 'Skill';
      manaCost = 16;
    } else if (nextAction === 'combat_ultimate') {
      actionType = 'ultimate';
      actionName = 'Ultimate';
      manaCost = 40;
    }

    // Kiểm tra mana
    if (run.mana < manaCost) {
      actionType = 'attack';
      actionName = 'Tấn công';
      manaCost = 0;
    }

    run.mana -= manaCost;

    // 3. Người chơi đánh
    const dmgInfo = calculatePlayerDamage(run, actionType);

    if (dmgInfo.isHeal) {
      const heal = dmgInfo.healAmount || Math.floor(run.maxHp * 0.25);
      run.hp = Math.min(run.maxHp, run.hp + heal);
      log.push(`✨ Bạn hồi **${heal}** HP!`);
    } else {
      let finalDamage = applyResistance(dmgInfo.amount, dmgInfo.type, enemy.resistances || {});

      if (Math.random() < 0.07) {
        log.push(`💨 ${enemy.name} đã né ${actionName}!`);
      } else {
        enemy.currentHp -= finalDamage;
        log.push(`⚔️ Auto dùng **${actionName}** gây **${finalDamage}** sát thương!`);
      }
    }

    if (enemy.currentHp <= 0) {
      enemy.currentHp = 0;
      enemyDied = true;
    }

    // 4. Địch đánh lại (nếu còn sống)
    if (!enemyDied) {
      const enemyStatusResult = processStatusEffects(enemy);
      if (enemyStatusResult.damage > 0) {
        enemy.currentHp -= enemyStatusResult.damage;
        log.push(...enemyStatusResult.messages.map(m => `${enemy.name}: ${m}`));
        if (enemy.currentHp <= 0) {
          enemy.currentHp = 0;
          enemyDied = true;
        }
      }

      if (!enemyDied) {
        if (tryDodge(run)) {
          log.push(`💨 Bạn né được đòn của ${enemy.name}!`);
        } else {
          let enemyDmg = calculateEnemyDamage(enemy, run);

          const playerResist = {
            physical: (run.stats?.strength || 10) * 0.8,
            fire: (run.stats?.vigor || 10) * 0.6,
            magic: (run.stats?.intelligence || 10) * 0.7,
            lightning: (run.stats?.dexterity || 10) * 0.7,
            holy: (run.stats?.faith || 10) * 0.7
          };

          enemyDmg = applyResistance(enemyDmg, enemy.damageType, playerResist);
          run.hp -= enemyDmg;
          log.push(`💥 ${enemy.name} gây **${enemyDmg}** sát thương!`);

          if (enemy.canApply && Math.random() < 0.3) {
            if (!run.combat.playerStatus) run.combat.playerStatus = {};
            run.combat.playerStatus[enemy.canApply] = (run.combat.playerStatus[enemy.canApply] || 0) + 2;
            log.push(`⚠️ Bạn bị dính **${enemy.canApply}**!`);
          }

          if (run.hp <= 0) {
  const { handleRunDefeat } = require('../systems/combatSystem');
  const embed = await handleRunDefeat(run, interaction, log);

  return interaction.editReply({ 
    content: null, 
    embeds: [embed], 
    components: [] 
  });
}
        }
      }
    }

    // Cập nhật combat state
    run.combat.turn += 1;
    run.combat.log = log.slice(-15);
    run.combat.enemy = enemy;

    if (playerDied || enemyDied) break;
  }

  // ===== Kết quả sau khi chạy Auto =====
  run.markModified('combat');

  // Thua
  if (run.hp <= 0) {
    run.combat = null;
    run.status = 'failed';
    run.currentPhase = 'ended';
    await run.save();

    const embed = new EmbedBuilder()
      .setTitle('💀 Bạn đã thất bại')
      .setDescription(log.slice(-10).join('\n') + '\n\n**Run kết thúc.**')
      .setColor(0x7F8C8D);

    return interaction.editReply({ content: null, embeds: [embed], components: [] });
  }

  // Thắng
  if (run.combat.enemy.currentHp <= 0) {
    const enemy = run.combat.enemy;
    const gainedRunes = Math.floor(Math.random() * (enemy.runeReward[1] - enemy.runeReward[0] + 1)) + enemy.runeReward[0];
    run.runes = (run.runes || 0) + gainedRunes;
    run.combat = null;

    const { generateRewards, createRewardEmbed } = require('../systems/rewardSystem');
    const rewards = generateRewards(1);
    run.tempRewards = rewards;
    run.markModified('tempRewards');
    await run.save();

    const { embed, row } = createRewardEmbed(run, `${enemy.emoji} ${enemy.name}`, rewards, gainedRunes);

    return interaction.editReply({
      content: `🎉 **Chiến thắng (Auto)!** +${gainedRunes} Rune`,
      embeds: [embed],
      components: [row]
    });
  }

  // Vẫn còn chiến đấu (hết lượt an toàn)
  await run.save();
  const embed = createCombatEmbed(run, run.combat);

  await interaction.editReply({
    content: `🔄 Auto đã chạy ${safety} lượt. Bấm **Auto** để tiếp tục hoặc tự đánh.`,
    embeds: [embed],
    components: createCombatButtons(run, false)
  });
  return;
}

// ---------- Dừng Auto ----------
if (action === 'combat_stop_auto') {
  const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
  if (!run || !run.combat) return;

  run.combat.isAuto = false;
  run.markModified('combat');
  await run.save();

  const { createCombatEmbed, createCombatButtons } = require('../systems/combatSystem');
  const embed = createCombatEmbed(run, run.combat);

  await interaction.editReply({
    content: 'Đã tắt Auto.',
    embeds: [embed],
    components: createCombatButtons(run, false)
  });
  return;
}

      // ---------- Grace Level Up ----------
      if (action === 'grace_levelup') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run) return;

        const levelUpCost = run.level * 100;
        if (run.runes < levelUpCost) {
          return interaction.followUp({ content: 'Không đủ Rune để lên cấp!', ephemeral: true });
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
          new ButtonBuilder()
            .setCustomId('grace_continue')
            .setLabel('Tiếp tục khám phá')
            .setStyle(ButtonStyle.Primary)
        );

        await interaction.editReply({ embeds: [embed], components: [row] });
        return;
      }

      // ---------- Continue sau Grace / Shop ----------
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

        const row = new ActionRowBuilder().addComponents(nextButtons);

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

        await interaction.editReply({ embeds: [embed], components: [row] });
        return;
      }

      // ---------- Rest Area: Hồi đầy ----------
if (action === 'rest_heal') {
  const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
  if (!run || run.currentPhase !== 'rest') return;

  run.hp = run.maxHp;
  run.mana = run.maxMana;
  await run.save();

  const embed = new EmbedBuilder()
    .setTitle('🏕️ Rest Area')
    .setDescription('Bạn đã hồi đầy HP và Mana.\nHãy chuẩn bị kỹ trước khi khiêu chiến Nightlord.')
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

// ---------- Rest Area: Lên cấp ----------
if (action === 'rest_levelup') {
  const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
  if (!run || run.currentPhase !== 'rest') return;

  const levelUpCost = run.level * 100;

  if (run.runes < levelUpCost) {
    return interaction.followUp({ content: `Không đủ Rune! Cần ${levelUpCost} Rune.`, ephemeral: true });
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

// ---------- Rest Area: Khiêu chiến Nightlord ----------
if (action === 'rest_fight_nightlord') {
  const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
  if (!run || run.currentPhase !== 'rest') return;

  const nightlordId = run.nightlord;
  const boss = nightlords[nightlordId];

  if (!boss) {
    return interaction.followUp({ content: 'Không tìm thấy Nightlord.', ephemeral: true });
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
    log: [`🌑 **NIGHTLORD** xuất hiện!\n${boss.emoji || '🌑'} **${boss.name}**\n${boss.description}`],
    isAuto: false,
    isNightlord: true,
    locationId: 'nightlord'
  };

  run.combat = combat;
  run.currentPhase = 'nightlord';
  run.markModified('combat');
  await run.save();

  const { createCombatEmbed, createCombatButtons } = require('../systems/combatSystem');
  const embed = createCombatEmbed(run, combat);
  const components = createCombatButtons(run, false);

  await interaction.editReply({
    content: `🌑 **Khiêu chiến ${boss.name}!**`,
    embeds: [embed],
    components
  });
  return;
}

// ---------- Relic: Trang bị ----------
if (action === 'relic_equip') {
  const user = await User.findOne({ discordId: interaction.user.id });
  if (!user) return;

  const unequipped = user.relics.filter(r => !r.equipped);
  if (unequipped.length === 0) {
    return interaction.followUp({ content: 'Không còn Relic để trang bị.', ephemeral: true });
  }

  const equippedCount = user.relics.filter(r => r.equipped).length;
  if (equippedCount >= 3) {
    return interaction.followUp({ content: 'Bạn đã trang bị tối đa 3 Relic.', ephemeral: true });
  }

  const options = unequipped.slice(0, 25).map((r, index) => ({
    label: r.name.slice(0, 100),
    description: `${r.rarity}`,
    value: String(index)
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId('relic_select_equip')
    .setPlaceholder('Chọn Relic để trang bị')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(select);

  await interaction.editReply({
    content: 'Chọn Relic bạn muốn trang bị:',
    embeds: [],
    components: [row]
  });
  return;
}

// ---------- Relic: Tháo ----------
if (action === 'relic_unequip') {
  const user = await User.findOne({ discordId: interaction.user.id });
  if (!user) return;

  const equipped = user.relics.filter(r => r.equipped);
  if (equipped.length === 0) {
    return interaction.followUp({ content: 'Bạn chưa trang bị Relic nào.', ephemeral: true });
  }

  // Tháo tất cả (đơn giản)
  user.relics.forEach(r => r.equipped = false);
  await user.save();

  await interaction.editReply({
    content: 'Đã tháo toàn bộ Relic.',
    embeds: [],
    components: []
  });
  return;
}

if (action === 'relic_select_equip') {
  const selectedIndex = parseInt(interaction.values[0]);
  const user = await User.findOne({ discordId: interaction.user.id });
  if (!user) return;

  const unequipped = user.relics.filter(r => !r.equipped);
  const selected = unequipped[selectedIndex];

  if (!selected) {
    return interaction.followUp({ content: 'Relic không tồn tại.', ephemeral: true });
  }

  // Đánh dấu trang bị
  const relicInDb = user.relics.find(r => 
    r.relicId === selected.relicId && !r.equipped && r.name === selected.name
  );
  if (relicInDb) relicInDb.equipped = true;

  await user.save();

  await interaction.editReply({
    content: `Đã trang bị **${selected.name}**!`,
    embeds: [],
    components: []
  });
  return;
}

    } catch (error) {
      console.error('Button error:', error);
      try {
        await interaction.followUp({ content: 'Đã xảy ra lỗi khi xử lý lựa chọn.', ephemeral: true });
      } catch (_) {}
    }
  },
};