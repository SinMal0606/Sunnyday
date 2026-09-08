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

// Chỉ defer nếu chưa acknowledged
if (!interaction.deferred && !interaction.replied) {
  try {
    await interaction.deferUpdate();
  } catch (err) {
    console.error('deferUpdate failed:', err.message);
    return;
  }
} else {
  console.log('Interaction đã deferred/replied, bỏ qua defer');
}

const [action, value] = interaction.customId.split(':');
console.log('[BUTTON]', action, value);

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

      // ===== PvP Action (phải parse riêng vì có nhiều dấu :) =====
if (interaction.customId.startsWith('pvp_action:')) {
  try {
    const parts = interaction.customId.split(':');
    // pvp_action : matchId : attack|skill|ultimate
    const matchId = parts[1];
    const pvpAction = parts[2]; // attack | skill | ultimate

    console.log('[PvP]', matchId, pvpAction);

    const {
      getMatch,
      createPvPEmbed,
      createPvPButtons,
      getPlayer,
      endMatch
    } = require('../systems/pvpSystem');
    const characters = require('../data/characters');

    const match = getMatch(matchId);
    if (!match || match.status !== 'active') {
      return interaction.followUp({
        content: 'Trận đã kết thúc hoặc không tồn tại.',
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }

    const userId = interaction.user.id;

    if (match.currentTurn !== userId) {
      return interaction.followUp({
        content: 'Chưa đến lượt bạn!',
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }

    

    const pair = getPlayer(match, userId);
    if (!pair) return;

    const { me, enemy } = pair;

    // ★ Khai báo log ở đây — tránh "log is not defined"
    let log = match.log || [];

let manaCost = 0;
let actionName = 'Tấn công';
let multiplier = 1.0;
let damageType = 'physical';
let isSpell = false;
let spell = null;

if (pvpAction === 'skill') {
  manaCost = characters[me.build.character]?.skill?.manaCost || 16;
  actionName = 'Skill';
  multiplier = characters[me.build.character]?.skill?.multiplier || 1.6;
} else if (pvpAction === 'ultimate') {
  manaCost = characters[me.build.character]?.ultimate?.manaCost || 40;
  actionName = 'Ultimate';
  multiplier = characters[me.build.character]?.ultimate?.multiplier || 2.5;
} else if (pvpAction?.startsWith('spell_')) {
  // spell_staff_0 | spell_seal_1
  isSpell = true;
  const segs = pvpAction.split('_'); // ['spell', 'staff', '0']
  const source = segs[1]; // staff | seal
  const index = parseInt(segs[2], 10);

  const equipped = me.equipped || me.build?.equipped || {};
  const item = source === 'staff' ? equipped.staff : equipped.seal;
  spell = item?.spells?.[index];

  if (!spell) {
    return interaction.followUp({
      content: 'Spell không tồn tại trên build này.',
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  }

  actionName = spell.name;
  manaCost = spell.manaCost || 12;
  multiplier = spell.multiplier || 1.6;
  damageType = spell.damageType || (source === 'staff' ? 'magic' : 'fire');
}

    if (me.mana < manaCost) {
      log.push(`❌ **${me.username}** không đủ Mana!`);
      match.log = log.slice(-12);

      // Update message public nếu có
      if (match.channelId && match.messageId) {
        try {
          const channel = await interaction.client.channels.fetch(match.channelId);
          const battleMsg = await channel.messages.fetch(match.messageId);
          await battleMsg.edit({
            embeds: [createPvPEmbed(match)],
            components: createPvPButtons(match)
          });
        } catch (e) {
          console.error('[PvP] edit failed:', e.message);
        }
      }
      return;
    }

    me.mana -= manaCost;

    const stats = me.stats || {};
    let base;

if (isSpell && spell) {
  if (spell.type === 'sorcery' || damageType === 'magic') {
    base = 18 + (stats.intelligence || 10) * 2.4;
  } else {
    base = 18 + (stats.faith || 10) * 2.3;
  }
  base = base * (spell.multiplier || multiplier);
} else {
  base = (20 + (stats.strength || 10) * 1.5 + (stats.dexterity || 10) * 0.8) * multiplier;
}

    const variance = 0.85 + Math.random() * 0.3;
    let damage = Math.floor(base * multiplier * variance);

    const enemyStats = enemy.stats || {};
    const resist = (enemyStats.strength || 10) * 0.5;
    damage = Math.max(1, Math.floor(damage * (1 - Math.min(40, resist) / 100)));

    function pvpWeaponClassBonus(me, damage, isSpell = false) {
  const char = characters[me.build.character];
  const preferred = char?.preferredWeaponClass;
  if (!preferred) return damage;

  const eq = me.equipped || me.build?.equipped || {};

  if (preferred === 'staff' && eq.staff?.weaponClass === 'staff') {
    return Math.floor(damage * 1.1);
  }
  if (preferred === 'seal' && eq.seal?.weaponClass === 'seal') {
    return Math.floor(damage * 1.1);
  }
  if (!isSpell && eq.weapon?.weaponClass === preferred) {
    return Math.floor(damage * 1.1);
  }
  return damage;
}

// dùng:
damage = pvpWeaponClassBonus(me, damage, isSpell);

    enemy.hp -= damage;
    log.push(
  isSpell
    ? `✨ **${me.username}** dùng **${actionName}** gây **${damage}** sát thương!`
    : `⚔️ **${me.username}** dùng **${actionName}** gây **${damage}** sát thương!`
);

    if (enemy.hp <= 0) {
      enemy.hp = 0;
      match.status = 'ended';
      match.winnerId = me.id;
      endMatch(matchId);
      log.push(`🏆 **${me.username}** chiến thắng!`);

      await User.findOneAndUpdate({ discordId: me.id }, { $inc: { murk: 25 } });
      await User.findOneAndUpdate({ discordId: enemy.id }, { $inc: { murk: 8 } });
    } else {
      match.currentTurn = enemy.id;
      match.turn += 1;
    }

    match.log = log.slice(-12);

    const turnName =
      match.currentTurn === match.player1.id
        ? match.player1.username
        : match.player2.username;

    const payload = {
      content:
        match.status !== 'active'
          ? `🏆 **${me.username}** thắng PvP!`
          : `⚔️ **PvP:** ${match.player1.username} vs ${match.player2.username}\n▶️ Lượt của **${turnName}**`,
      embeds: [createPvPEmbed(match)],
      components: match.status === 'active' ? createPvPButtons(match) : []
    };

    // Edit message trận (public)
    if (match.channelId && match.messageId) {
      try {
        const channel = await interaction.client.channels.fetch(match.channelId);
        const battleMsg = await channel.messages.fetch(match.messageId);
        await battleMsg.edit(payload);
      } catch (e) {
        console.error('[PvP] edit battle message failed:', e.message);
      }
    }

    return;
  } catch (err) {
    console.error('[PvP] action error:', err);
    return;
  }
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
  console.log('[GRACE] continue');

  const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
  if (!run) {
    return interaction.followUp({
      content: 'Không tìm thấy run.',
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  }

  // Sau level up, phase vẫn nên là exploring
  if (run.currentPhase !== 'exploring') {
    run.currentPhase = 'exploring';
    await run.save();
  }

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

      // ---------- Chọn Phần thưởng ----------
if (action === 'reward') {
  const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
  if (!run || !run.tempRewards || run.tempRewards.length === 0) {
    return interaction.followUp({
      content: 'Không tìm thấy phần thưởng.',
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  }

  const index = parseInt(value, 10);
  const chosen = run.tempRewards[index];
  if (!chosen) {
    return interaction.followUp({
      content: 'Lựa chọn không hợp lệ.',
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  }

  let resultMsg = '';

  // ===== Nhận trang bị =====
  if (chosen.type === 'equipment') {
    if (!run.inventory) {
      run.inventory = {
        weapons: [],
        armors: [],
        staffs: [],
        seals: [],
        consumables: [],
        equipped: {}
      };
    }

    const eq = chosen.data;
    if (eq?.type === 'weapon') run.inventory.weapons.push(eq);
    else if (eq?.type === 'armor') run.inventory.armors.push(eq);
    else if (eq?.type === 'staff') run.inventory.staffs.push(eq);
    else if (eq?.type === 'seal') run.inventory.seals.push(eq);

    resultMsg = `Bạn đã nhận: **${eq?.name || 'Trang bị'}**`;
    if (eq?.spells?.length) {
      resultMsg += `\nSpell: ${eq.spells.map(s => s.name).join(' + ')}`;
    }
  }

  // ===== Nhận buff vĩnh viễn trong run =====
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

  // Hồi đầy sau combat
  run.hp = run.maxHp;
  run.mana = run.maxMana;

  // ===== Sau Miniboss 2 → Rest Area =====
  if (run.currentPhase === 'rest') {
    await run.save();

    const embed = new EmbedBuilder()
      .setTitle('🏕️ Rest Area')
      .setDescription(
        `${resultMsg}\n\nBạn đã đánh bại Miniboss 2.\nHãy nghỉ ngơi và chuẩn bị đối đầu **Nightlord**.`
      )
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

  // ===== Site of Grace sau combat thường / miniboss 1 =====
  await run.save();

  const levelUpCost = run.level * 100;
  const canLevelUp = (run.runes || 0) >= levelUpCost;

  const buttons = [];
  if (canLevelUp) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('post_combat_levelup')
        .setLabel(`Lên cấp (${levelUpCost} Rune)`)
        .setStyle(ButtonStyle.Success)
    );
  }
  buttons.push(
    new ButtonBuilder()
      .setCustomId('post_combat_continue')
      .setLabel('Tiếp tục khám phá')
      .setStyle(ButtonStyle.Primary)
  );

  const embed = new EmbedBuilder()
    .setTitle('✨ Site of Grace')
    .setDescription(
      `${resultMsg}\n\n` +
      `Bạn tìm thấy Site of Grace tại đây.\n` +
      `HP và Mana đã **hồi đầy**.\n\n` +
      `Rune: **${run.runes}** | Cần **${levelUpCost}** Rune để lên cấp.`
    )
    .setColor(0xF1C40F)
    .addFields(
      { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
      { name: 'Mana', value: `${run.mana}/${run.maxMana}`, inline: true },
      { name: 'Level', value: `${run.level}`, inline: true },
      { name: 'Location đã đi', value: `${run.locationsVisited}`, inline: true }
    );

  await interaction.editReply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(buttons)]
  });
  return;
}

      if (action === 'select_nightlord') {
  console.log('[NL] start', value);
  try {
    const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
    console.log('[NL] run:', !!run, 'phase:', run?.currentPhase);

    if (!run) {
      return interaction.followUp({
        content: 'Không tìm thấy run active. Dùng `/start` lại.',
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }

    // Cho phép tiếp tục nếu đang kẹt phase
    if (run.currentPhase !== 'select_nightlord') {
      console.log('[NL] phase sai, ép về select_nightlord');
      // Nếu muốn cứng: báo lỗi
      // return interaction.followUp({ content: `Phase hiện tại: ${run.currentPhase}`, flags: MessageFlags.Ephemeral });
    }

    const nightlord = nightlords[value];
    console.log('[NL] nightlord:', nightlord?.name);

    if (!nightlord) {
      return interaction.followUp({
        content: 'Nightlord không tồn tại.',
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }

    run.nightlord = value;
    run.currentPhase = 'select_character';
    await run.save();
    console.log('[NL] saved');

    const validCharacters = ['wylder', 'recluse', 'ironfist', 'seer'];
    const characterButtons = validCharacters.map(charId => {
      const char = characters[charId];
      if (!char) {
        console.log('[NL] missing char', charId);
        return null;
      }
      return new ButtonBuilder()
        .setCustomId(`select_character:${charId}`)
        .setLabel(char.name)
        .setStyle(ButtonStyle.Primary);
    }).filter(Boolean);

    if (characterButtons.length === 0) {
      return interaction.editReply({
        content: 'Lỗi: không load được nhân vật (characters.js).',
        embeds: [],
        components: []
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('Chọn Nhân vật')
      .setDescription(`Bạn đã chọn **${nightlord.name}**.\nHãy chọn nhân vật.`)
      .setColor(0x5865F2)
      .addFields(
        { name: 'Nightlord', value: nightlord.name, inline: true },
        { name: 'Độ khó', value: String(nightlord.difficulty || '?'), inline: true }
      );

    await interaction.editReply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(characterButtons)]
    });
    console.log('[NL] editReply ok');
    return;
  } catch (err) {
    console.error('[NL] ERROR:', err);
    await interaction.followUp({
      content: 'Lỗi khi chọn Nightlord: ' + err.message,
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  }
}

if (action === 'post_combat_levelup') {
  const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
  if (!run) return;

  const levelUpCost = run.level * 100;
  if ((run.runes || 0) < levelUpCost) {
    return interaction.followUp({
      content: `Không đủ Rune! Cần ${levelUpCost}.`,
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  }

  run.runes -= levelUpCost;
  run.level += 1;

  const newStats = calculateStats(run.character, run.level);
  run.stats = newStats;
  run.maxHp = calculateMaxHp(newStats.vigor);
  run.maxMana = calculateMaxMana(newStats.mind);
  run.hp = run.maxHp;
  run.mana = run.maxMana;

  // Áp dụng lại trang bị nếu có
  try {
    applyEquipmentStats(run);
    run.hp = run.maxHp;
    run.mana = run.maxMana;
  } catch (_) {}

  await run.save();

  const nextCost = run.level * 100;
  const canLevelUp = run.runes >= nextCost;
  const buttons = [];
  if (canLevelUp) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('post_combat_levelup')
        .setLabel(`Lên cấp (${nextCost} Rune)`)
        .setStyle(ButtonStyle.Success)
    );
  }
  buttons.push(
    new ButtonBuilder()
      .setCustomId('post_combat_continue')
      .setLabel('Tiếp tục khám phá')
      .setStyle(ButtonStyle.Primary)
  );

  const embed = new EmbedBuilder()
    .setTitle('✨ Lên cấp thành công!')
    .setDescription(`Bạn đã lên **Level ${run.level}**!\nCó thể lên tiếp hoặc tiếp tục khám phá.`)
    .setColor(0x2ECC71)
    .addFields(
      { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
      { name: 'Mana', value: `${run.mana}/${run.maxMana}`, inline: true },
      { name: 'Runes', value: `${run.runes}`, inline: true }
    );

  await interaction.editReply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(buttons)]
  });
  return;
}

if (action === 'post_combat_continue') {
  const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
  if (!run) return;

  run.currentPhase = 'exploring';
  await run.save();

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

      // ---------- Rest Area ----------
      if (action === 'rest_heal') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run || run.currentPhase !== 'rest') return;

        run.tempRewards = undefined;
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

// ====================== COMBAT ======================
if (action === 'combat_attack' || action === 'combat_skill' || action === 'combat_ultimate' || action === 'combat_spell') {
  const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
  if (!run || !run.combat) {
    return interaction.followUp({ content: 'Không có trận đấu nào đang diễn ra.', flags: MessageFlags.Ephemeral });
  }

  const combat = run.combat;
  const enemy = combat.enemy;
  let log = combat.log || [];
  let playerDied = false;
  let enemyDied = false;

  // Status đầu lượt
  const playerStatusResult = processStatusEffects({ status: combat.playerStatus || {} });
  if (playerStatusResult.damage > 0) {
    run.hp -= playerStatusResult.damage;
    log.push(...playerStatusResult.messages.map(m => `Bạn: ${m}`));
    if (run.hp <= 0) {
      run.hp = 0;
      playerDied = true;
    }
  }

  if (playerDied) {
    const result = await handleRunDefeat(run, interaction, log);
return interaction.editReply({
  content: null,
  embeds: [result.embed],
  components: result.components
});
  }

  // Xác định hành động
  let actionType = 'attack';
  let actionName = 'Tấn công';
  let manaCost = 0;
  let spell = null;

  if (action === 'combat_skill') {
    actionType = 'skill';
    actionName = 'Skill';
    manaCost = characters[run.character]?.skill?.manaCost || 16;
  } else if (action === 'combat_ultimate') {
    actionType = 'ultimate';
    actionName = 'Ultimate';
    manaCost = characters[run.character]?.ultimate?.manaCost || 40;
  } else if (action === 'combat_spell') {
    const spellIndex = parseInt(value);
    const staff = run.inventory?.equipped?.staff;
    const seal = run.inventory?.equipped?.seal;
    spell = staff?.spells?.[spellIndex] || seal?.spells?.[spellIndex];

    if (!spell) {
      return interaction.followUp({ content: 'Spell không tồn tại.', flags: MessageFlags.Ephemeral });
    }
    actionName = spell.name;
    manaCost = spell.manaCost || 12;
  }

  if (run.mana < manaCost) {
    log.push(`❌ Không đủ Mana để dùng **${actionName}**!`);
    combat.log = log.slice(-15);
    run.markModified('combat');
    await run.save();
    return interaction.editReply({
      embeds: [createCombatEmbed(run, combat)],
      components: createCombatButtons(run, false)
    });
  }

  run.mana -= manaCost;

  // Gây sát thương
  if (action === 'combat_spell' && spell) {
    const dmgInfo = calculateSpellDamage(run, spell);
    let finalDamage = applyResistance(dmgInfo.amount, dmgInfo.type, enemy.resistances || {});

    if (Math.random() < 0.07) {
      log.push(`💨 ${enemy.name} đã né **${spell.name}**!`);
    } else {
      enemy.currentHp -= finalDamage;
      log.push(`✨ Bạn dùng **${spell.name}** gây **${finalDamage}** sát thương ${dmgInfo.type}!`);
    }
  } else {
    const dmgInfo = calculatePlayerDamage(run, actionType);

    if (dmgInfo.isHeal) {
      const heal = dmgInfo.healAmount || Math.floor(run.maxHp * 0.25);
      run.hp = Math.min(run.maxHp, run.hp + heal);
      log.push(`✨ Bạn hồi **${heal}** HP!`);
    } else {
      let finalDamage = applyResistance(dmgInfo.amount, dmgInfo.type, enemy.resistances || {});
      if (Math.random() < 0.07) {
        log.push(`💨 ${enemy.name} đã né **${actionName}**!`);
      } else {
        enemy.currentHp -= finalDamage;
        log.push(`⚔️ Bạn dùng **${actionName}** gây **${finalDamage}** sát thương ${dmgInfo.type}!`);
      }
    }
  }

  if (enemy.currentHp <= 0) {
    enemy.currentHp = 0;
    enemyDied = true;
  }

  // Địch đánh lại
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
        log.push(`💨 Bạn đã **né** đòn của ${enemy.name}!`);
      } else {
        let enemyDmg = calculateEnemyDamage(enemy, run);
        const armorDef = run.defense || {};
        const playerResist = {
          physical: (run.stats?.strength || 10) * 0.8 + (armorDef.physical || 0),
          fire: (run.stats?.vigor || 10) * 0.6 + (armorDef.fire || 0),
          magic: (run.stats?.intelligence || 10) * 0.7 + (armorDef.magic || 0),
          lightning: (run.stats?.dexterity || 10) * 0.7 + (armorDef.lightning || 0),
          holy: (run.stats?.faith || 10) * 0.7 + (armorDef.holy || 0)
        };

        enemyDmg = applyResistance(enemyDmg, enemy.damageType, playerResist);
        run.hp -= enemyDmg;
        log.push(`💥 ${enemy.name} gây **${enemyDmg}** sát thương ${enemy.damageType}!`);

        if (enemy.canApply && Math.random() < 0.3) {
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

  combat.turn += 1;
  combat.log = log.slice(-15);
  combat.enemy = enemy;

  // Thua
  if (playerDied) {
    const result = await handleRunDefeat(run, interaction, log);
return interaction.editReply({
  content: null,
  embeds: [result.embed],
  components: result.components
});
  }

  // Thắng
  if (enemyDied) {
    const isNightlord = combat.isNightlord;
    const isMiniboss = combat.isMiniboss;
    const gainedRunes = Math.floor(
      Math.random() * (enemy.runeReward[1] - enemy.runeReward[0] + 1)
    ) + enemy.runeReward[0];

    run.runes = (run.runes || 0) + gainedRunes;
    run.combat = null;

    if (isNightlord) {
  run.status = 'completed';
  run.currentPhase = 'ended';

  const murkGained = 80 + run.locationsVisited * 2 + run.level * 3;

  await User.findOneAndUpdate(
    { discordId: interaction.user.id },
    { $inc: { murk: murkGained, wins: 1, totalRuns: 1 }, lastActive: new Date() }
  );

  // Giữ data build để lưu (quan trọng)
  run.pendingBuild = true;
  await run.save();

  const embed = new EmbedBuilder()
    .setTitle('🎉 CHIẾN THẮNG NIGHTLORD!')
    .setDescription(`Bạn đã đánh bại **${enemy.name}**!\n\nBạn có muốn **lưu build** run này để dùng PvP không?`)
    .setColor(0xF1C40F)
    .addFields(
      { name: 'Rune nhận được', value: `${gainedRunes}`, inline: true },
      { name: 'Murk nhận được', value: `${murkGained}`, inline: true },
      { name: 'Level cuối', value: `${run.level}`, inline: true },
      { name: 'Location đã đi', value: `${run.locationsVisited}`, inline: true }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('save_build')
      .setLabel('Lưu Build run này')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('skip_save_build')
      .setLabel('Bỏ qua')
      .setStyle(ButtonStyle.Secondary)
  );

  return interaction.editReply({ embeds: [embed], components: [row] });
}

    const lootTier = isMiniboss ? 2 : 1;
    const rewards = generateRewards(lootTier, run.character);
    run.tempRewards = rewards;

    if (combat.minibossType === 'miniboss2' || run.currentPhase === 'miniboss2') {
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

  // Còn đánh tiếp
  run.combat = combat;
  run.markModified('combat');
  await run.save();

  await interaction.editReply({
    embeds: [createCombatEmbed(run, combat)],
    components: createCombatButtons(run, false)
  });
  return;
}

// ---------- Auto Combat ----------
if (action === 'combat_auto') {
  const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
  if (!run || !run.combat) return;

  run.combat.isAuto = true;
  let log = run.combat.log || [];
  let safety = 0;
  const maxTurns = 15;

  while (run.combat?.isAuto && safety < maxTurns) {
    safety++;
    const enemy = run.combat.enemy;
    let playerDied = false;
    let enemyDied = false;

    const playerStatusResult = processStatusEffects({ status: run.combat.playerStatus || {} });
    if (playerStatusResult.damage > 0) {
      run.hp -= playerStatusResult.damage;
      log.push(...playerStatusResult.messages.map(m => `Bạn: ${m}`));
      if (run.hp <= 0) {
        run.hp = 0;
        playerDied = true;
      }
    }
    if (playerDied) break;

    const nextAction = runAutoTurn(run);
    let actionType = 'attack';
    let actionName = 'Tấn công';
    let manaCost = 0;

    if (nextAction === 'combat_skill') {
      actionType = 'skill';
      actionName = 'Skill';
      manaCost = characters[run.character]?.skill?.manaCost || 16;
    } else if (nextAction === 'combat_ultimate') {
      actionType = 'ultimate';
      actionName = 'Ultimate';
      manaCost = characters[run.character]?.ultimate?.manaCost || 40;
    }

    if (run.mana < manaCost) {
      actionType = 'attack';
      actionName = 'Tấn công';
      manaCost = 0;
    }
    run.mana -= manaCost;

    const dmgInfo = calculatePlayerDamage(run, actionType);
    if (dmgInfo.isHeal) {
      const heal = dmgInfo.healAmount || Math.floor(run.maxHp * 0.25);
      run.hp = Math.min(run.maxHp, run.hp + heal);
      log.push(`✨ Auto hồi **${heal}** HP!`);
    } else {
      let finalDamage = applyResistance(dmgInfo.amount, dmgInfo.type, enemy.resistances || {});
      enemy.currentHp -= finalDamage;
      log.push(`⚔️ Auto **${actionName}** gây **${finalDamage}** sát thương!`);
    }

    if (enemy.currentHp <= 0) {
      enemy.currentHp = 0;
      enemyDied = true;
    }

    if (!enemyDied) {
      if (tryDodge(run)) {
        log.push(`💨 Bạn né được đòn địch!`);
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

    run.combat.turn += 1;
    run.combat.log = log.slice(-15);
    run.combat.enemy = enemy;
    if (playerDied || enemyDied) break;
  }

  run.markModified('combat');

  if (run.hp <= 0) {
    const result = await handleRunDefeat(run, interaction, log);
return interaction.editReply({
  content: null,
  embeds: [result.embed],
  components: result.components
});
  }

  if (run.combat.enemy.currentHp <= 0) {
    const enemy = run.combat.enemy;
    const isNightlord = run.combat.isNightlord;
    const isMiniboss = run.combat.isMiniboss;
    const gainedRunes = Math.floor(Math.random() * (enemy.runeReward[1] - enemy.runeReward[0] + 1)) + enemy.runeReward[0];
    run.runes = (run.runes || 0) + gainedRunes;
    run.combat = null;

    if (isNightlord) {
  run.status = 'completed';
  run.currentPhase = 'ended';

  const murkGained = 80 + run.locationsVisited * 2 + run.level * 3;

  await User.findOneAndUpdate(
    { discordId: interaction.user.id },
    { $inc: { murk: murkGained, wins: 1, totalRuns: 1 }, lastActive: new Date() }
  );

  // Giữ data build để lưu (quan trọng)
  run.pendingBuild = true;
  await run.save();

  const embed = new EmbedBuilder()
    .setTitle('🎉 CHIẾN THẮNG NIGHTLORD!')
    .setDescription(`Bạn đã đánh bại **${enemy.name}**!\n\nBạn có muốn **lưu build** run này để dùng PvP không?`)
    .setColor(0xF1C40F)
    .addFields(
      { name: 'Rune nhận được', value: `${gainedRunes}`, inline: true },
      { name: 'Murk nhận được', value: `${murkGained}`, inline: true },
      { name: 'Level cuối', value: `${run.level}`, inline: true },
      { name: 'Location đã đi', value: `${run.locationsVisited}`, inline: true }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('save_build')
      .setLabel('Lưu Build run này')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('skip_save_build')
      .setLabel('Bỏ qua')
      .setStyle(ButtonStyle.Secondary)
  );

  return interaction.editReply({ embeds: [embed], components: [row] });
}

    const lootTier = isMiniboss ? 2 : 1;
    const rewards = generateRewards(lootTier, run.character);
    run.tempRewards = rewards;
    if (run.currentPhase === 'miniboss2') run.currentPhase = 'rest';
    else run.currentPhase = 'exploring';
    run.markModified('tempRewards');
    await run.save();

    const { embed, row } = createRewardEmbed(run, `${enemy.emoji} ${enemy.name}`, rewards, gainedRunes);
    return interaction.editReply({
      content: `🎉 **Chiến thắng (Auto)!** +${gainedRunes} Rune`,
      embeds: [embed],
      components: [row]
    });
  }

  await run.save();
  await interaction.editReply({
    content: `🔄 Auto đã chạy ${safety} lượt.`,
    embeds: [createCombatEmbed(run, run.combat)],
    components: createCombatButtons(run, false)
  });
  return;
}

if (action === 'combat_stop_auto') {
  const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
  if (!run || !run.combat) return;

  run.combat.isAuto = false;
  run.markModified('combat');
  await run.save();

  await interaction.editReply({
    content: 'Đã tắt Auto.',
    embeds: [createCombatEmbed(run, run.combat)],
    components: createCombatButtons(run, false)
  });
  return;
}

// ---------- Lưu Build ----------
if (action === 'save_build') {
  const run = await Run.findOne({
    userId: interaction.user.id,
    status: { $in: ['completed', 'failed', 'active'] }
  }).sort({ updatedAt: -1 });

  if (!run || !run.character) {
    return interaction.followUp({ content: 'Không tìm thấy build để lưu.', flags: MessageFlags.Ephemeral });
  }

  const user = await User.findOne({ discordId: interaction.user.id });
  if (!user) return;

  if (!user.savedBuilds) user.savedBuilds = [];

  // Tối đa 5 build — xóa build cũ nhất nếu đầy
  if (user.savedBuilds.length >= 5) {
    user.savedBuilds.shift();
  }

  const buildName = `${characters[run.character]?.name || run.character} Lv.${run.level}`;

  user.savedBuilds.push({
    name: buildName,
    character: run.character,
    level: run.level,
    stats: run.stats,
    maxHp: run.maxHp,
    maxMana: run.maxMana,
    equipped: {
      weapon: run.inventory?.equipped?.weapon || null,
      armor: run.inventory?.equipped?.armor || null,
      staff: run.inventory?.equipped?.staff || null,
      seal: run.inventory?.equipped?.seal || null
    }
  });

  await user.save();

  await interaction.editReply({
    content: `Đã lưu build **${buildName}**!\nBạn có ${user.savedBuilds.length}/5 build.`,
    embeds: [],
    components: []
  });
  return;
}

if (action === 'skip_save_build') {
  await interaction.editReply({
    content: 'Đã bỏ qua lưu build.',
    embeds: [],
    components: []
  });
  return;
}

// ---------- PvP: Chọn build ----------
if (action === 'pvp_select_build') {
  const buildIndex = parseInt(value);
  const userId = interaction.user.id;

  const user = await User.findOne({ discordId: userId });
  if (!user?.savedBuilds?.[buildIndex]) {
    return interaction.followUp({ content: 'Build không hợp lệ.', flags: MessageFlags.Ephemeral });
  }

  const {
    addToQueue,
    removeFromQueue,
    findOpponent,
    createMatch,
    getMatchByUser
  } = require('../systems/pvpSystem');

  if (getMatchByUser(userId)) {
    return interaction.followUp({ content: 'Bạn đang trong trận PvP.', flags: MessageFlags.Ephemeral });
  }

  removeFromQueue(userId); // xóa queue cũ nếu có

  const myBuild = user.savedBuilds[buildIndex];
  const opponent = findOpponent(userId);

  // Không có đối thủ → vào hàng chờ
  if (!opponent) {
    addToQueue(userId, {
  build: myBuild,
  username: interaction.user.username,
  channelId: interaction.channelId
});

const reply = await interaction.editReply({
  content: `Đã chọn build **${myBuild.name}**.\n⏳ Đang tìm đối thủ...`,
  embeds: [],
  components: [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('pvp_cancel_queue')
        .setLabel('Hủy tìm trận')
        .setStyle(ButtonStyle.Secondary)
    )
  ]
});

// Lưu messageId vào queue
const { queue } = require('../systems/pvpSystem');
const q = queue.get(userId);
if (q) {
  q.messageId = reply.id;
  q.channelId = reply.channelId || interaction.channelId;
  queue.set(userId, q);
}
return;
  }

  // Có đối thủ → tạo match
  removeFromQueue(opponent.id);

const match = createMatch(
  { id: userId, username: interaction.user.username, build: myBuild },
  { id: opponent.id, username: opponent.data.username, build: opponent.data.build }
);

const { createPvPEmbed } = require('../systems/pvpSystem');

// Nút luôn bật — kiểm tra lượt trong handler
const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId(`pvp_action:${match.id}:attack`)
    .setLabel('Tấn công')
    .setStyle(ButtonStyle.Danger),
  new ButtonBuilder()
    .setCustomId(`pvp_action:${match.id}:skill`)
    .setLabel('Skill')
    .setStyle(ButtonStyle.Primary),
  new ButtonBuilder()
    .setCustomId(`pvp_action:${match.id}:ultimate`)
    .setLabel('Ultimate')
    .setStyle(ButtonStyle.Secondary)
);

// Gửi message CÔNG KHAI trong channel (không ephemeral)
const battleMsg = await interaction.channel.send({
  content: `⚔️ **PvP:** ${interaction.user.username} vs ${opponent.data.username}\n▶️ Lượt của **${interaction.user.username}**`,
  embeds: [createPvPEmbed(match)],
  components: [row]
});

match.channelId = battleMsg.channelId;
match.messageId = battleMsg.id;

// Trả lời ephemeral ngắn cho người vừa match
await interaction.editReply({
  content: `Đã tìm thấy **${opponent.data.username}**!\nXem trận ở tin nhắn bên dưới trong channel.`,
  embeds: [],
  components: []
});

return;
}

// ---------- PvP: Hủy queue ----------
if (action === 'pvp_cancel_queue') {
  const { removeFromQueue } = require('../systems/pvpSystem');
  removeFromQueue(interaction.user.id);

  await interaction.editReply({
    content: 'Đã hủy tìm trận PvP.',
    embeds: [],
    components: []
  });
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