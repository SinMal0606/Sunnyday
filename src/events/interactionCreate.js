const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MessageFlags
} = require('discord.js');

const nightlords = require('../data/nightlords');
const charactersLegacy = require('../data/characters');
const Run = require('../models/Run');
const User = require('../models/User');
const { applyStatusBuildup } = require('../systems/combatSystem');

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
  handleRunDefeat,
  ensureCombatMeta,
  canUseSkill,
  canUseUltimate,
  addUltimateCharge,
  applySkillEffects,
  tickCombatMeta,
  createStatusState,
  scaleEnemyTemplate
} = require('../systems/combatSystem');

const { createShopEmbed, createShopButtons, buyItem } = require('../systems/shopSystem');
const { getCharacter, getCharacterData } = require('../characters');

const {
  addToQueue,
  removeFromQueue,
  findOpponent,
  createMatch,
  getMatch,
  getMatchByUser,
  endMatch,
  createPvPEmbed,
  createPvPButtons,
  getPlayer
} = require('../systems/pvpSystem');

function getCharName(id) {
  return getCharacterData(id)?.name || charactersLegacy[id]?.name || id;
}

function buildPlayerResist(run) {
  const armorDef = run.defense || {};
  return {
    physical: (run.stats?.strength || 10) * 0.8 + (armorDef.physical || 0),
    fire: (run.stats?.vigor || 10) * 0.6 + (armorDef.fire || 0),
    magic: (run.stats?.intelligence || 10) * 0.7 + (armorDef.magic || 0),
    lightning: (run.stats?.dexterity || 10) * 0.7 + (armorDef.lightning || 0),
    holy: (run.stats?.faith || 10) * 0.7 + (armorDef.holy || 0)
  };
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // ====================== SLASH ======================
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        const msg = { content: 'Có lỗi khi thực hiện lệnh.', flags: MessageFlags.Ephemeral };
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
        if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
      } catch {
        return;
      }

      const [action, value] = interaction.customId.split(':');

      try {
        if (action === 'inv_select') {
          const equipKey = value;
          const selectedIndex = parseInt(interaction.values[0], 10);
          const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
          if (!run) return;

          const listKeyMap = { weapon: 'weapons', armor: 'armors', staff: 'staffs', seal: 'seals' };
          const items = run.inventory?.[listKeyMap[equipKey]] || [];
          const selectedItem = items[selectedIndex];
          if (!selectedItem) {
            return interaction.followUp({ content: 'Món đồ không tồn tại.', flags: MessageFlags.Ephemeral }).catch(() => {});
          }

          if (!run.inventory.equipped) run.inventory.equipped = {};
          run.inventory.equipped[equipKey] = selectedItem;
          applyEquipmentStats(run);
          run.markModified('inventory');
          await run.save();

          await interaction.editReply({
            content: `Đã mặc **${selectedItem.name}**!`,
            embeds: [createInventoryEmbed(run)],
            components: createInventoryComponents(run)
          });
        }

        if (action === 'relic_select_equip') {
          const selectedIndex = parseInt(interaction.values[0], 10);
          const user = await User.findOne({ discordId: interaction.user.id });
          if (!user) return;
          const unequipped = (user.relics || []).filter(r => !r.equipped);
          const selected = unequipped[selectedIndex];
          if (!selected) {
            return interaction.followUp({ content: 'Relic không tồn tại.', flags: MessageFlags.Ephemeral }).catch(() => {});
          }
          const relicInDb = user.relics.find(
            r => r.relicId === selected.relicId && !r.equipped && r.name === selected.name
          );
          if (relicInDb) relicInDb.equipped = true;
          await user.save();
          await interaction.editReply({ content: `Đã trang bị **${selected.name}**!`, embeds: [], components: [] });
        }
      } catch (error) {
        console.error('SelectMenu error:', error);
      }
      return;
    }

    // ====================== BUTTON ======================
    if (!interaction.isButton()) return;

    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }
    } catch (err) {
      console.error('deferUpdate failed:', err.message);
      return;
    }

    // ----- PvP (customId nhiều :) -----
    if (interaction.customId.startsWith('pvp_action:')) {
      try {
        const parts = interaction.customId.split(':');
        const matchId = parts[1];
        const pvpAction = parts[2];
        const match = getMatch(matchId);
        if (!match || match.status !== 'active') {
          return interaction.followUp({ content: 'Trận đã kết thúc.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }

        const userId = interaction.user.id;
        if (match.currentTurn !== userId) {
          return interaction.followUp({ content: 'Chưa đến lượt bạn!', flags: MessageFlags.Ephemeral }).catch(() => {});
        }

        const pair = getPlayer(match, userId);
        if (!pair) return;
        const { me, enemy } = pair;
        let log = match.log || [];

        if (pvpAction === 'attack') {
          const stats = me.stats || {};
          const damage = Math.floor(
            (20 + (stats.strength || 10) * 1.5 + (stats.dexterity || 10) * 0.8) * (0.85 + Math.random() * 0.3)
          );
          enemy.hp -= damage;
          log.push(`⚔️ **${me.username}** tấn công **${damage}**!`);
        } else if (pvpAction === 'skill') {
          const mod = getCharacter(me.build.character);
          if (mod) {
            const result = mod.executeSkill({
              me, enemy, combat: match, stats: me.stats, equipped: me.equipped
            });
            log.push(...(result.log || []));
            if (result.heal) me.hp = Math.min(me.maxHp, me.hp + result.heal);
            if (result.damage) enemy.hp -= result.damage;
          }
        } else if (pvpAction === 'ultimate') {
          const mod = getCharacter(me.build.character);
          if (mod) {
            const result = mod.executeUltimate({
              me, enemy, combat: match, stats: me.stats, equipped: me.equipped
            });
            log.push(...(result.log || []));
            if (result.heal) me.hp = Math.min(me.maxHp, me.hp + result.heal);
            if (result.damage) enemy.hp -= result.damage;
          }
        } else if (pvpAction?.startsWith('spell_')) {
          const segs = pvpAction.split('_');
          const source = segs[1];
          const index = parseInt(segs[2], 10);
          const item = source === 'staff' ? me.equipped?.staff : me.equipped?.seal;
          const spell = item?.spells?.[index];
          if (!spell) {
            return interaction.followUp({ content: 'Spell không tồn tại.', flags: MessageFlags.Ephemeral }).catch(() => {});
          }
          if (me.mana < (spell.manaCost || 12)) {
            log.push(`❌ **${me.username}** không đủ Mana!`);
          } else {
            me.mana -= spell.manaCost || 12;
            const stats = me.stats || {};
            let base =
              spell.type === 'sorcery'
                ? 18 + (stats.intelligence || 10) * 2.4
                : 18 + (stats.faith || 10) * 2.3;
            base *= spell.multiplier || 1.6;
            const damage = Math.floor(base * (0.85 + Math.random() * 0.3));
            enemy.hp -= damage;
            log.push(`✨ **${me.username}** **${spell.name}** gây **${damage}**!`);
          }
        }

        if (enemy.hp <= 0) {
          enemy.hp = 0;
          match.status = 'ended';
          match.winnerId = me.id;
          endMatch(matchId);
          log.push(`🏆 **${me.username}** thắng!`);
          await User.findOneAndUpdate({ discordId: me.id }, { $inc: { murk: 25 } });
          await User.findOneAndUpdate({ discordId: enemy.id }, { $inc: { murk: 8 } });
        } else {
          match.currentTurn = enemy.id;
          match.turn += 1;
        }

        match.log = log.slice(-12);
        const turnName =
          match.currentTurn === match.player1.id ? match.player1.username : match.player2.username;

        const payload = {
          content:
            match.status !== 'active'
              ? `🏆 **${me.username}** thắng PvP!`
              : `⚔️ **PvP:** ${match.player1.username} vs ${match.player2.username}\n▶️ Lượt **${turnName}**`,
          embeds: [createPvPEmbed(match)],
          components: match.status === 'active' ? createPvPButtons(match) : []
        };

        if (match.channelId && match.messageId) {
          try {
            const channel = await interaction.client.channels.fetch(match.channelId);
            const battleMsg = await channel.messages.fetch(match.messageId);
            await battleMsg.edit(payload);
          } catch (e) {
            console.error('[PvP] edit failed:', e.message);
          }
        }
      } catch (err) {
        console.error('[PvP]', err);
      }
      return;
    }

    const [action, value] = interaction.customId.split(':');
    console.log('[BUTTON]', action, value);

    try {
      // ---------- helpers combat ----------
      async function finishCombatWin(run, combat, enemy) {
        const isNightlord = combat.isNightlord;
        const isMiniboss = combat.isMiniboss;
        const gainedRunes =
          Math.floor(Math.random() * ((enemy.runeReward?.[1] || 50) - (enemy.runeReward?.[0] || 30) + 1)) +
          (enemy.runeReward?.[0] || 30);

        run.runes = (run.runes || 0) + gainedRunes;
        run.combat = null;

        if (isNightlord) {
          run.status = 'completed';
          run.currentPhase = 'ended';
          run.pendingBuild = true;
          const murkGained = 80 + (run.locationsVisited || 0) * 2 + (run.level || 1) * 3;
          await User.findOneAndUpdate(
            { discordId: interaction.user.id },
            { $inc: { murk: murkGained, wins: 1, totalRuns: 1 }, lastActive: new Date() }
          );
          await run.save();
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setTitle('🎉 CHIẾN THẮNG NIGHTLORD!')
                .setDescription(`Đánh bại **${enemy.name}**!\n+${gainedRunes} Rune | +${murkGained} Murk\nLưu build?`)
                .setColor(0xF1C40F)
            ],
            components: [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('save_build').setLabel('Lưu Build').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('skip_save_build').setLabel('Bỏ qua').setStyle(ButtonStyle.Secondary)
              )
            ]
          });
        }

        const rewards = generateRewards(isMiniboss ? 2 : 1, run.character);
        run.tempRewards = rewards;
        if (combat.minibossType === 'miniboss2') run.currentPhase = 'rest';
        else run.currentPhase = 'exploring';
        run.markModified('tempRewards');
        await run.save();

        const { embed, row } = createRewardEmbed(run, `${enemy.emoji || ''} ${enemy.name}`, rewards, gainedRunes);
        return interaction.editReply({
          content: `🎉 Thắng${isMiniboss ? ' MINIBOSS' : ''}! +${gainedRunes} Rune`,
          embeds: [embed],
          components: [row]
        });
      }

      function enemyHitPlayer(run, combat, enemy, log) {
  let playerDied = false;
  let enemyDied = false;

  if (tryDodge(run)) {
    log.push(`💨 Bạn né đòn của ${enemy.name}!`);
    return { playerDied, enemyDied };
  }

  let enemyDmg = calculateEnemyDamage(enemy, run);
  const playerResist = buildPlayerResist(run);
  const resBonus = combat.playerBuffs?.resistanceBonus?.value || 0;
  if (resBonus) {
    for (const k of Object.keys(playerResist)) playerResist[k] += resBonus;
  }

  enemyDmg = applyResistance(
    enemyDmg,
    enemy.damageType,
    playerResist,
    combat._playerResistPenalty || 0
  );

  const reflect = combat.playerBuffs?.reflect?.value || 0;
  if (reflect > 0) {
    const refDmg = Math.floor(enemyDmg * reflect);
    enemy.currentHp -= refDmg;
    log.push(`🛡️ Phản **${refDmg}**!`);
    if (enemy.currentHp <= 0) {
      enemy.currentHp = 0;
      enemyDied = true;
    }
  }

  if (!enemyDied) {
    run.hp -= enemyDmg;
    log.push(`💥 ${enemy.name} gây **${enemyDmg}** sát thương!`);

    // ★ Build-up status từ quái
    if (enemy.canApply && combat.playerStatusState) {
      const r = applyStatusBuildup(
        combat.playerStatusState,
        enemy.canApply,
        enemy.buildupAmount || 35,
        { maxHp: run.maxHp, maxMana: run.maxMana }
      );
      if (r.messages.length) log.push(...r.messages);
      if (r.instantDamage > 0) run.hp -= r.instantDamage;
      if (r.manaLoss > 0) run.mana = Math.max(0, run.mana - r.manaLoss);
    }

    if (run.hp <= 0) {
      run.hp = 0;
      playerDied = true;
    }
  }

  return { playerDied, enemyDied };
}

      /** Đầu lượt: tick status. return true nếu đã xử lý xong (sleep/death) */
      async function tickPlayerStatusOrStop(run, combat, enemy, log) {
        const tick = processStatusEffects(combat.playerStatusState);
        if (tick.messages?.length) {
          log.push(...tick.messages.map(m => `Bạn: ${m}`));
        }
        combat._playerResistPenalty = tick.resistPenalty || 0;

        if (tick.damage > 0) {
          run.hp -= tick.damage;
          if (run.hp <= 0) {
            run.hp = 0;
            combat.log = log.slice(-15);
            run.combat = combat;
            run.markModified('combat');
            await run.save();
            const def = await handleRunDefeat(run, interaction, log);
            await interaction.editReply({
              embeds: [def.embed || def],
              components: def.components || []
            });
            return true;
          }
        }

        if (tick.skipTurn) {
          log.push('Bạn đang ngủ – bỏ lượt!');
          const c = enemyHitPlayer(run, combat, enemy, log);
          combat.turn += 1;
          tickCombatMeta(combat);
          combat.log = log.slice(-15);
          combat.enemy = enemy;
          run.combat = combat;
          run.markModified('combat');

          if (c.playerDied || run.hp <= 0) {
            run.hp = 0;
            await run.save();
            const def = await handleRunDefeat(run, interaction, log);
            await interaction.editReply({
              embeds: [def.embed || def],
              components: def.components || []
            });
            return true;
          }
          await run.save();
          await interaction.editReply({
            embeds: [createCombatEmbed(run, combat)],
            components: createCombatButtons(run, false)
          });
          return true;
        }
        return false;
      }

      // ---------- Inventory ----------
      if (
        action === 'inv_equip_weapon' ||
        action === 'inv_equip_armor' ||
        action === 'inv_equip_staff' ||
        action === 'inv_equip_seal'
      ) {
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
        const items = run.inventory?.[typeMap[action]] || [];
        if (!items.length) {
          return interaction.followUp({ content: 'Không có món để mặc.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
        const options = items.slice(0, 25).map((item, index) => ({
          label: String(item.name).slice(0, 100),
          description: String(item.description || item.rarity || 'Trang bị').slice(0, 50),
          value: String(index)
        }));
        const select = new StringSelectMenuBuilder()
          .setCustomId(`inv_select:${equipKeyMap[action]}`)
          .setPlaceholder(`Chọn ${equipKeyMap[action]}`)
          .addOptions(options);
        await interaction.editReply({
          content: `Chọn **${equipKeyMap[action]}**:`,
          embeds: [],
          components: [new ActionRowBuilder().addComponents(select)]
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
        await interaction.editReply({
          content: 'Đã tháo trang bị.',
          embeds: [createInventoryEmbed(run)],
          components: createInventoryComponents(run)
        });
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
        const unequipped = (user.relics || []).filter(r => !r.equipped);
        if (!unequipped.length) {
          return interaction.followUp({ content: 'Không còn Relic.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
        if ((user.relics || []).filter(r => r.equipped).length >= 3) {
          return interaction.followUp({ content: 'Tối đa 3 Relic.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
        const options = unequipped.slice(0, 25).map((r, i) => ({
          label: String(r.name).slice(0, 100),
          description: String(r.rarity || ''),
          value: String(i)
        }));
        await interaction.editReply({
          content: 'Chọn Relic:',
          embeds: [],
          components: [
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('relic_select_equip')
                .setPlaceholder('Relic')
                .addOptions(options)
            )
          ]
        });
        return;
      }

      if (action === 'relic_unequip') {
        const user = await User.findOne({ discordId: interaction.user.id });
        if (!user) return;
        (user.relics || []).forEach(r => (r.equipped = false));
        await user.save();
        await interaction.editReply({ content: 'Đã tháo Relic.', embeds: [], components: [] });
        return;
      }

      // ---------- Save build ----------
      if (action === 'save_build') {
        const run = await Run.findOne({ userId: interaction.user.id, pendingBuild: true }).sort({ updatedAt: -1 });
        if (!run?.character) {
          return interaction.followUp({ content: 'Không có build để lưu.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
        const user = await User.findOne({ discordId: interaction.user.id });
        if (!user) return;
        if (!user.savedBuilds) user.savedBuilds = [];
        if (user.savedBuilds.length >= 5) user.savedBuilds.shift();
        const buildName = `${getCharName(run.character)} Lv.${run.level}`;
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
        run.pendingBuild = false;
        await user.save();
        await run.save();
        await interaction.editReply({
          content: `Đã lưu **${buildName}** (${user.savedBuilds.length}/5)`,
          embeds: [],
          components: []
        });
        return;
      }

      if (action === 'skip_save_build') {
        await Run.findOneAndUpdate(
          { userId: interaction.user.id, pendingBuild: true },
          { pendingBuild: false }
        );
        await interaction.editReply({ content: 'Đã bỏ qua lưu build.', embeds: [], components: [] });
        return;
      }

      // ---------- Nightlord ----------
      if (action === 'select_nightlord') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run) {
          return interaction.followUp({ content: 'Không có run. /start', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
        const nightlord = nightlords[value];
        if (!nightlord) {
          return interaction.followUp({ content: 'Nightlord không tồn tại.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
        run.nightlord = value;
        run.currentPhase = 'select_character';
        await run.save();

        const characterButtons = ['wylder', 'recluse', 'ironfist', 'seer'].map(
          charId =>
            new ButtonBuilder()
              .setCustomId(`select_character:${charId}`)
              .setLabel(getCharName(charId))
              .setStyle(ButtonStyle.Primary)
        );

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Chọn Nhân vật')
              .setDescription(`Nightlord: **${nightlord.name}**`)
              .setColor(0x5865F2)
          ],
          components: [new ActionRowBuilder().addComponents(characterButtons)]
        });
        return;
      }

      // ---------- Character ----------
      if (action === 'select_character') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run || run.currentPhase !== 'select_character') {
          return interaction.followUp({ content: 'Run không hợp lệ.', flags: MessageFlags.Ephemeral }).catch(() => {});
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

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Bắt đầu khám phá')
              .setDescription(`**${getCharName(value)}** – chọn địa điểm:`)
              .setColor(0x57F287)
              .addFields(
                { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
                { name: 'Mana', value: `${run.mana}/${run.maxMana}`, inline: true },
                { name: 'Level', value: `${run.level}`, inline: true }
              )
          ],
          components: [new ActionRowBuilder().addComponents(locationButtons)]
        });
        return;
      }

      // ---------- Location ----------
      if (action === 'select_location') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run) {
          return interaction.followUp({ content: 'Không có run.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }

        if (run.currentPhase !== 'exploring') {
          if (run.combat) {
            return interaction.editReply({
              content: 'Đang combat – /continue nếu cần.',
              embeds: [createCombatEmbed(run, run.combat)],
              components: createCombatButtons(run, false)
            });
          }
          if (['miniboss1', 'miniboss2'].includes(run.currentPhase) && !run.combat) {
            run.currentPhase = 'exploring';
          } else {
            return interaction.followUp({
              content: `Không ở khám phá (phase: ${run.currentPhase}). /continue hoặc /abandon`,
              flags: MessageFlags.Ephemeral
            }).catch(() => {});
          }
        }

        const selectedId = value;
        const selected = locations[selectedId];
        if (!selected) {
          return interaction.followUp({
            content: `Địa điểm không hợp lệ: ${selectedId}`,
            flags: MessageFlags.Ephemeral
          }).catch(() => {});
        }

        try {
          const result = await handleLocation(run, selectedId);
          run.locationsVisited = (run.locationsVisited || 0) + 1;
          run.locationHistory = run.locationHistory || [];
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
          console.log('[FLOOR]', run.locationsVisited, 'special=', special);

          // Grace
          if (result.isGrace) {
            await run.save();
            const levelUpCost = result.levelUpCost || run.level * 100;
            const buttons = [];
            if (run.runes >= levelUpCost) {
              buttons.push(
                new ButtonBuilder()
                  .setCustomId('grace_levelup')
                  .setLabel(`Lên cấp (${levelUpCost} Rune)`)
                  .setStyle(ButtonStyle.Success)
              );
            }
            buttons.push(
              new ButtonBuilder().setCustomId('grace_continue').setLabel('Tiếp tục khám phá').setStyle(ButtonStyle.Primary)
            );
            return interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTitle(`${selected.emoji} ${selected.name}`)
                  .setDescription(result.message || 'Site of Grace')
                  .setColor(0xF1C40F)
                  .addFields(
                    { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
                    { name: 'Mana', value: `${run.mana}/${run.maxMana}`, inline: true },
                    { name: 'Level', value: `${run.level}`, inline: true },
                    { name: 'Runes', value: `${run.runes}`, inline: true }
                  )
              ],
              components: [new ActionRowBuilder().addComponents(buttons)]
            });
          }

          // Shop
          if (result.isShop) {
            await run.save();
            return interaction.editReply({
              embeds: [createShopEmbed(run)],
              components: createShopButtons()
            });
          }

          // ★ MINIBOSS TRƯỚC combat thường
          if (special === 'miniboss1' || special === 'miniboss2') {
            const bossRaw = getMiniboss(special);
            if (!bossRaw) {
              await run.save();
              return interaction.followUp({ content: 'Lỗi data miniboss.', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
            const bossTemplate =
              typeof scaleEnemyTemplate === 'function'
                ? scaleEnemyTemplate(bossRaw, run.locationsVisited)
                : bossRaw;

            const combat = {
              enemy: {
                id: bossTemplate.id,
                name: bossTemplate.name,
                emoji: bossTemplate.emoji,
                currentHp: bossTemplate.hp,
                maxHp: bossTemplate.hp,
                damage: bossTemplate.damage,
                damageType: bossTemplate.damageType,
                resistances: bossTemplate.resistances || {},
                canApply: bossTemplate.canApply || null,
                buildupAmount: bossTemplate.buildupAmount || 45,
                runeReward: bossTemplate.runeReward || [150, 250],
                status: {},
                statusState: createStatusState({}, false)
              },
              turn: 1,
              log: [`⚠️ **MINIBOSS** – ${bossTemplate.emoji} **${bossTemplate.name}**`],
              isAuto: false,
              isMiniboss: true,
              minibossType: special,
              skillCooldown: 0,
              ultimateCharge: 0,
              playerBuffs: {},
              enemyDebuffs: {},
              playerStatusState: createStatusState(run.stats || {}, true),
              playerStatus: {}
            };

            run.combat = combat;
            run.currentPhase = special;
            run.markModified('combat');
            await run.save();

            return interaction.editReply({
              content: `⚠️ **${bossTemplate.name}**!`,
              embeds: [createCombatEmbed(run, combat)],
              components: createCombatButtons(run, false)
            });
          }

          // Combat thường
          if (result.isCombat || result.startCombat) {
            const combat = createCombatState(run, selectedId);
            ensureCombatMeta(combat, run);
            if (!combat.playerStatusState) {
              combat.playerStatusState = createStatusState(run.stats || {}, true);
            }
            if (combat.enemy && !combat.enemy.statusState) {
              combat.enemy.statusState = createStatusState({}, false);
            }
            run.combat = combat;
            run.currentPhase = 'exploring';
            run.markModified('combat');
            await run.save();

            return interaction.editReply({
              embeds: [createCombatEmbed(run, combat)],
              components: createCombatButtons(run, false)
            });
          }

          await run.save();
        } catch (err) {
          console.error('[LOC]', err);
          try {
            const again = await Run.findOne({ userId: interaction.user.id, status: 'active' });
            if (again && !again.combat && again.currentPhase !== 'exploring') {
              again.currentPhase = 'exploring';
              await again.save();
            }
          } catch (_) {}
          return interaction.followUp({
            content: `Lỗi location: ${err.message}`,
            flags: MessageFlags.Ephemeral
          }).catch(() => {});
        }
        return;
      }

      // ---------- Shop ----------
      if (action === 'shop_buy') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run) return;
        const result = await buyItem(run, parseInt(value, 10));
        await run.save();
        if (!result.success) {
          return interaction.followUp({ content: result.message, flags: MessageFlags.Ephemeral }).catch(() => {});
        }
        const embed = createShopEmbed(run);
        embed.setDescription(`${result.message}\n\nRune: **${run.runes}**`);
        await interaction.editReply({ embeds: [embed], components: createShopButtons() });
        return;
      }

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
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Rời cửa hàng')
              .setDescription('Chọn địa điểm:')
              .setColor(0x3498DB)
              .addFields(
                { name: 'Location', value: `${run.locationsVisited}`, inline: true },
                { name: 'Runes', value: `${run.runes}`, inline: true }
              )
          ],
          components: [new ActionRowBuilder().addComponents(nextButtons)]
        });
        return;
      }

      // ---------- Grace ----------
      if (action === 'grace_levelup' || action === 'post_combat_levelup') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run) return;
        const cost = run.level * 100;
        if ((run.runes || 0) < cost) {
          return interaction.followUp({ content: `Cần ${cost} Rune.`, flags: MessageFlags.Ephemeral }).catch(() => {});
        }
        run.runes -= cost;
        run.level += 1;
        const newStats = calculateStats(run.character, run.level);
        run.stats = newStats;
        run.maxHp = calculateMaxHp(newStats.vigor);
        run.maxMana = calculateMaxMana(newStats.mind);
        try {
          applyEquipmentStats(run);
        } catch (_) {}
        run.hp = run.maxHp;
        run.mana = run.maxMana;
        await run.save();

        const nextCost = run.level * 100;
        const contId = action === 'grace_levelup' ? 'grace_continue' : 'post_combat_continue';
        const buttons = [];
        if (run.runes >= nextCost) {
          buttons.push(
            new ButtonBuilder()
              .setCustomId(action)
              .setLabel(`Lên cấp (${nextCost} Rune)`)
              .setStyle(ButtonStyle.Success)
          );
        }
        buttons.push(
          new ButtonBuilder().setCustomId(contId).setLabel('Tiếp tục khám phá').setStyle(ButtonStyle.Primary)
        );

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('✨ Lên cấp!')
              .setDescription(`Level **${run.level}**`)
              .setColor(0x2ECC71)
              .addFields(
                { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
                { name: 'Runes', value: `${run.runes}`, inline: true }
              )
          ],
          components: [new ActionRowBuilder().addComponents(buttons)]
        });
        return;
      }

      if (action === 'grace_continue' || action === 'post_combat_continue' || action === 'shop_continue') {
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
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Tiếp tục hành trình')
              .setDescription('Chọn địa điểm:')
              .setColor(0x3498DB)
              .addFields(
                { name: 'Location', value: `${run.locationsVisited}`, inline: true },
                { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
                { name: 'Level', value: `${run.level}`, inline: true },
                { name: 'Runes', value: `${run.runes}`, inline: true }
              )
          ],
          components: [new ActionRowBuilder().addComponents(nextButtons)]
        });
        return;
      }

      // ---------- Reward ----------
      if (action === 'reward') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run?.tempRewards?.length) {
          return interaction.followUp({ content: 'Không tìm thấy phần thưởng.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
        const chosen = run.tempRewards[parseInt(value, 10)];
        if (!chosen) {
          return interaction.followUp({ content: 'Lựa chọn không hợp lệ.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }

        let resultMsg = '';
        if (chosen.type === 'equipment') {
          if (!run.inventory) {
            run.inventory = { weapons: [], armors: [], staffs: [], seals: [], consumables: [], equipped: {} };
          }
          const eq = chosen.data;
          if (eq?.type === 'weapon') run.inventory.weapons.push(eq);
          else if (eq?.type === 'armor') run.inventory.armors.push(eq);
          else if (eq?.type === 'staff') run.inventory.staffs.push(eq);
          else if (eq?.type === 'seal') run.inventory.seals.push(eq);
          resultMsg = `Nhận: **${eq?.name || 'Trang bị'}**`;
          if (eq?.spells?.length) resultMsg += `\nSpell: ${eq.spells.map(s => s.name).join(' + ')}`;
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
          resultMsg = `Buff: **${buff.name}**`;
        }

        run.tempRewards = undefined;
        run.hp = run.maxHp;
        run.mana = run.maxMana;

        if (run.currentPhase === 'rest') {
          await run.save();
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setTitle('🏕️ Rest Area')
                .setDescription(`${resultMsg}\n\nChuẩn bị Nightlord.`)
                .setColor(0x1ABC9C)
                .addFields(
                  { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
                  { name: 'Level', value: `${run.level}`, inline: true },
                  { name: 'Runes', value: `${run.runes}`, inline: true }
                )
            ],
            components: [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('rest_heal').setLabel('Hồi đầy').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('rest_levelup').setLabel('Lên cấp').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('rest_fight_nightlord').setLabel('Nightlord').setStyle(ButtonStyle.Danger)
              )
            ]
          });
        }

        await run.save();
        const levelUpCost = run.level * 100;
        const buttons = [];
        if ((run.runes || 0) >= levelUpCost) {
          buttons.push(
            new ButtonBuilder()
              .setCustomId('post_combat_levelup')
              .setLabel(`Lên cấp (${levelUpCost} Rune)`)
              .setStyle(ButtonStyle.Success)
          );
        }
        buttons.push(
          new ButtonBuilder().setCustomId('post_combat_continue').setLabel('Tiếp tục khám phá').setStyle(ButtonStyle.Primary)
        );

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('✨ Site of Grace')
              .setDescription(`${resultMsg}\n\nHP/Mana hồi đầy.\nRune: **${run.runes}** | Level up: **${levelUpCost}**`)
              .setColor(0xF1C40F)
              .addFields(
                { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
                { name: 'Level', value: `${run.level}`, inline: true },
                { name: 'Location', value: `${run.locationsVisited}`, inline: true }
              )
          ],
          components: [new ActionRowBuilder().addComponents(buttons)]
        });
        return;
      }

      // ---------- Rest ----------
      if (action === 'rest_heal') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run || run.currentPhase !== 'rest') return;
        run.hp = run.maxHp;
        run.mana = run.maxMana;
        await run.save();
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('🏕️ Rest Area')
              .setDescription('Đã hồi đầy.')
              .setColor(0x1ABC9C)
              .addFields(
                { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
                { name: 'Mana', value: `${run.mana}/${run.maxMana}`, inline: true }
              )
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('rest_heal').setLabel('Hồi đầy').setStyle(ButtonStyle.Success),
              new ButtonBuilder().setCustomId('rest_levelup').setLabel('Lên cấp').setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId('rest_fight_nightlord').setLabel('Nightlord').setStyle(ButtonStyle.Danger)
            )
          ]
        });
        return;
      }

      if (action === 'rest_levelup') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run || run.currentPhase !== 'rest') return;
        const cost = run.level * 100;
        if (run.runes < cost) {
          return interaction.followUp({ content: `Cần ${cost} Rune.`, flags: MessageFlags.Ephemeral }).catch(() => {});
        }
        run.runes -= cost;
        run.level += 1;
        const newStats = calculateStats(run.character, run.level);
        run.stats = newStats;
        run.maxHp = calculateMaxHp(newStats.vigor);
        run.maxMana = calculateMaxMana(newStats.mind);
        try {
          applyEquipmentStats(run);
        } catch (_) {}
        run.hp = run.maxHp;
        run.mana = run.maxMana;
        await run.save();
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('✨ Lên cấp!')
              .setDescription(`Level **${run.level}**`)
              .setColor(0x2ECC71)
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('rest_heal').setLabel('Hồi đầy').setStyle(ButtonStyle.Success),
              new ButtonBuilder().setCustomId('rest_levelup').setLabel('Lên cấp').setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId('rest_fight_nightlord').setLabel('Nightlord').setStyle(ButtonStyle.Danger)
            )
          ]
        });
        return;
      }

      if (action === 'rest_fight_nightlord') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run || run.currentPhase !== 'rest') return;
        const boss = nightlords[run.nightlord];
        if (!boss) {
          return interaction.followUp({ content: 'Không tìm thấy Nightlord.', flags: MessageFlags.Ephemeral }).catch(() => {});
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
            buildupAmount: boss.buildupAmount || 50,
            runeReward: boss.runeReward || [600, 900],
            status: {},
            statusState: createStatusState({}, false)
          },
          turn: 1,
          log: [`🌑 **NIGHTLORD** – ${boss.name}`],
          isAuto: false,
          isNightlord: true,
          skillCooldown: 0,
          ultimateCharge: 0,
          playerBuffs: {},
          enemyDebuffs: {},
          playerStatusState: createStatusState(run.stats || {}, true),
          playerStatus: {}
        };
        run.combat = combat;
        run.currentPhase = 'nightlord';
        run.markModified('combat');
        await run.save();
        await interaction.editReply({
          content: `🌑 **${boss.name}**!`,
          embeds: [createCombatEmbed(run, combat)],
          components: createCombatButtons(run, false)
        });
        return;
      }

      // ---------- Combat Attack ----------
      if (action === 'combat_attack') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run?.combat) return;

        const combat = ensureCombatMeta(run.combat, run);
        const enemy = combat.enemy;
        let log = combat.log || [];

        if (await tickPlayerStatusOrStop(run, combat, enemy, log)) return;

        const dmgInfo = calculatePlayerDamage(run, 'attack');
        let finalDamage = applyResistance(dmgInfo.amount, dmgInfo.type, enemy.resistances || {});
        if (Math.random() < 0.07) log.push(`💨 ${enemy.name} né!`);
        else {
          enemy.currentHp -= finalDamage;
          log.push(`⚔️ Tấn công **${finalDamage}** (${dmgInfo.type})!`);
        }

        const weapon = run.inventory?.equipped?.weapon;
if (weapon?.status && enemy.statusState) {
  const buildupAmt = weapon.buildup || 40;
  const r = applyStatusBuildup(enemy.statusState, weapon.status, buildupAmt, {
    maxHp: enemy.maxHp,
    maxMana: 0
  });
  if (r.messages.length) log.push(...r.messages);
  if (r.instantDamage > 0) {
    enemy.currentHp -= r.instantDamage;
    if (enemy.currentHp < 0) enemy.currentHp = 0;
  }
}

        const data = getCharacterData(run.character);
        addUltimateCharge(combat, run.character, data?.ultimate?.chargeOnAttack || 18);

        let enemyDied = enemy.currentHp <= 0;
        if (enemyDied) enemy.currentHp = 0;
        let playerDied = false;
        if (!enemyDied) {
          const c = enemyHitPlayer(run, combat, enemy, log);
          playerDied = c.playerDied;
          enemyDied = enemyDied || c.enemyDied;
        }

        combat.turn += 1;
        tickCombatMeta(combat);
        combat.log = log.slice(-15);
        combat.enemy = enemy;
        run.combat = combat;
        run.markModified('combat');

        if (playerDied) {
          await run.save();
          const def = await handleRunDefeat(run, interaction, log);
          return interaction.editReply({ embeds: [def.embed || def], components: def.components || [] });
        }
        if (enemyDied) return finishCombatWin(run, combat, enemy);

        await run.save();
        return interaction.editReply({
          embeds: [createCombatEmbed(run, combat)],
          components: createCombatButtons(run, false)
        });
      }

      // ---------- Combat Skill ----------
      if (action === 'combat_skill') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run?.combat) return;

        const combat = ensureCombatMeta(run.combat, run);
        const enemy = combat.enemy;
        let log = combat.log || [];
        const mod = getCharacter(run.character);
        const data = getCharacterData(run.character);

        if (!mod || !data?.skill) {
          return interaction.followUp({
            content: 'Nhân vật chưa có skill module.',
            flags: MessageFlags.Ephemeral
          }).catch(() => {});
        }

        if (await tickPlayerStatusOrStop(run, combat, enemy, log)) return;

        if (!canUseSkill(combat)) {
          log.push(`⏳ Skill CD: **${combat.skillCooldown}**`);
          combat.log = log.slice(-15);
          run.markModified('combat');
          await run.save();
          return interaction.editReply({
            embeds: [createCombatEmbed(run, combat)],
            components: createCombatButtons(run, false)
          });
        }
        if (run.mana < data.skill.manaCost) {
          log.push('❌ Không đủ Mana!');
          combat.log = log.slice(-15);
          run.markModified('combat');
          await run.save();
          return interaction.editReply({
            embeds: [createCombatEmbed(run, combat)],
            components: createCombatButtons(run, false)
          });
        }

        run.mana -= data.skill.manaCost;
        const skillResult = mod.executeSkill({
          run, combat, stats: run.stats, equipped: run.inventory?.equipped
        });
        log.push(...(skillResult.log || []));
        if (skillResult.heal) run.hp = Math.min(run.maxHp, run.hp + skillResult.heal);
        if (skillResult.damage > 0) {
          enemy.currentHp -= applyResistance(
            skillResult.damage,
            skillResult.damageType || 'physical',
            enemy.resistances || {}
          );
        }
        applySkillEffects(combat, skillResult.effects);
        combat.skillCooldown = data.skill.cooldown || 3;
        addUltimateCharge(combat, run.character, data.ultimate?.chargeOnSkill || 28);

        let enemyDied = enemy.currentHp <= 0;
        if (enemyDied) enemy.currentHp = 0;
        let playerDied = false;
        if (!enemyDied) {
          const c = enemyHitPlayer(run, combat, enemy, log);
          playerDied = c.playerDied;
          enemyDied = enemyDied || c.enemyDied;
        }

        combat.turn += 1;
        tickCombatMeta(combat);
        combat.log = log.slice(-15);
        combat.enemy = enemy;
        run.combat = combat;
        run.markModified('combat');

        if (playerDied) {
          await run.save();
          const def = await handleRunDefeat(run, interaction, log);
          return interaction.editReply({ embeds: [def.embed || def], components: def.components || [] });
        }
        if (enemyDied) return finishCombatWin(run, combat, enemy);

        await run.save();
        return interaction.editReply({
          embeds: [createCombatEmbed(run, combat)],
          components: createCombatButtons(run, false)
        });
      }

      // ---------- Combat Ultimate ----------
      if (action === 'combat_ultimate') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run?.combat) return;

        const combat = ensureCombatMeta(run.combat, run);
        const enemy = combat.enemy;
        let log = combat.log || [];
        const mod = getCharacter(run.character);
        const data = getCharacterData(run.character);

        if (!mod || !data?.ultimate) {
          return interaction.followUp({ content: 'Chưa có ultimate module.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }

        if (await tickPlayerStatusOrStop(run, combat, enemy, log)) return;

        if (!canUseUltimate(combat, run.character)) {
          log.push(`⚡ Ult: **${combat.ultimateCharge}/${data.ultimate.chargeRequired}**`);
          combat.log = log.slice(-15);
          run.markModified('combat');
          await run.save();
          return interaction.editReply({
            embeds: [createCombatEmbed(run, combat)],
            components: createCombatButtons(run, false)
          });
        }

        const ultResult = mod.executeUltimate({
          run, combat, stats: run.stats, equipped: run.inventory?.equipped
        });
        log.push(...(ultResult.log || []));
        if (ultResult.heal) run.hp = Math.min(run.maxHp, run.hp + ultResult.heal);
        if (ultResult.damage > 0) {
          enemy.currentHp -= applyResistance(
            ultResult.damage,
            ultResult.damageType || 'physical',
            enemy.resistances || {}
          );
        }
        applySkillEffects(combat, ultResult.effects);
        combat.ultimateCharge = 0;

        let enemyDied = enemy.currentHp <= 0;
        if (enemyDied) enemy.currentHp = 0;
        let playerDied = false;
        if (!enemyDied) {
          const c = enemyHitPlayer(run, combat, enemy, log);
          playerDied = c.playerDied;
          enemyDied = enemyDied || c.enemyDied;
        }

        combat.turn += 1;
        tickCombatMeta(combat);
        combat.log = log.slice(-15);
        combat.enemy = enemy;
        run.combat = combat;
        run.markModified('combat');

        if (playerDied) {
          await run.save();
          const def = await handleRunDefeat(run, interaction, log);
          return interaction.editReply({ embeds: [def.embed || def], components: def.components || [] });
        }
        if (enemyDied) return finishCombatWin(run, combat, enemy);

        await run.save();
        return interaction.editReply({
          embeds: [createCombatEmbed(run, combat)],
          components: createCombatButtons(run, false)
        });
      }

      // ---------- Combat Spell ----------
      if (action === 'combat_spell') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run?.combat) return;

        const combat = ensureCombatMeta(run.combat, run);
        const enemy = combat.enemy;
        let log = combat.log || [];
        const spellIndex = parseInt(value, 10);
        const staff = run.inventory?.equipped?.staff;
        const seal = run.inventory?.equipped?.seal;
        const spell = staff?.spells?.[spellIndex] || seal?.spells?.[spellIndex];
        if (!spell) {
          return interaction.followUp({ content: 'Spell không tồn tại.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }

        if (await tickPlayerStatusOrStop(run, combat, enemy, log)) return;

        if (run.mana < (spell.manaCost || 12)) {
          log.push(`❌ Không đủ Mana (**${spell.name}**)!`);
          combat.log = log.slice(-15);
          run.markModified('combat');
          await run.save();
          return interaction.editReply({
            embeds: [createCombatEmbed(run, combat)],
            components: createCombatButtons(run, false)
          });
        }

        run.mana -= spell.manaCost || 12;
        const dmgInfo = calculateSpellDamage(run, spell);
        const finalDamage = applyResistance(dmgInfo.amount, dmgInfo.type, enemy.resistances || {});
        enemy.currentHp -= finalDamage;
        log.push(`✨ **${spell.name}** **${finalDamage}** (${dmgInfo.type})!`);

        const data = getCharacterData(run.character);
        addUltimateCharge(combat, run.character, data?.ultimate?.chargeOnSkill || 20);

        let enemyDied = enemy.currentHp <= 0;
        if (enemyDied) enemy.currentHp = 0;
        let playerDied = false;
        if (!enemyDied) {
          const c = enemyHitPlayer(run, combat, enemy, log);
          playerDied = c.playerDied;
          enemyDied = enemyDied || c.enemyDied;
        }

        combat.turn += 1;
        tickCombatMeta(combat);
        combat.log = log.slice(-15);
        combat.enemy = enemy;
        run.combat = combat;
        run.markModified('combat');

        if (playerDied) {
          await run.save();
          const def = await handleRunDefeat(run, interaction, log);
          return interaction.editReply({ embeds: [def.embed || def], components: def.components || [] });
        }
        if (enemyDied) return finishCombatWin(run, combat, enemy);

        await run.save();
        return interaction.editReply({
          embeds: [createCombatEmbed(run, combat)],
          components: createCombatButtons(run, false)
        });
      }

      // ---------- Auto ----------
      if (action === 'combat_auto') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run?.combat) return;

        let combat = ensureCombatMeta(run.combat, run);
        let log = combat.log || [];
        let safety = 0;

        while (run.hp > 0 && combat.enemy.currentHp > 0 && safety < 12) {
          safety++;
          const enemy = combat.enemy;

          const tick = processStatusEffects(combat.playerStatusState);
          if (tick.messages?.length) log.push(...tick.messages.map(m => `Bạn: ${m}`));
          combat._playerResistPenalty = tick.resistPenalty || 0;
          if (tick.damage > 0) {
            run.hp -= tick.damage;
            if (run.hp <= 0) break;
          }
          if (tick.skipTurn) {
            enemyHitPlayer(run, combat, enemy, log);
            combat.turn += 1;
            tickCombatMeta(combat);
            if (run.hp <= 0) break;
            continue;
          }

          const next = runAutoTurn(run);
          const data = getCharacterData(run.character);
          const mod = getCharacter(run.character);

          if (next === 'combat_skill' && mod && canUseSkill(combat) && run.mana >= (data?.skill?.manaCost || 99)) {
            run.mana -= data.skill.manaCost;
            const r = mod.executeSkill({ run, combat, stats: run.stats, equipped: run.inventory?.equipped });
            log.push(...(r.log || []));
            if (r.damage) {
              enemy.currentHp -= applyResistance(r.damage, r.damageType || 'physical', enemy.resistances || {});
            }
            if (r.heal) run.hp = Math.min(run.maxHp, run.hp + r.heal);
            applySkillEffects(combat, r.effects);
            combat.skillCooldown = data.skill.cooldown || 3;
            addUltimateCharge(combat, run.character, data.ultimate?.chargeOnSkill || 28);
          } else if (next === 'combat_ultimate' && mod && canUseUltimate(combat, run.character)) {
            const r = mod.executeUltimate({ run, combat, stats: run.stats, equipped: run.inventory?.equipped });
            log.push(...(r.log || []));
            if (r.damage) {
              enemy.currentHp -= applyResistance(r.damage, r.damageType || 'physical', enemy.resistances || {});
            }
            applySkillEffects(combat, r.effects);
            combat.ultimateCharge = 0;
          } else {
            const dmgInfo = calculatePlayerDamage(run, 'attack');
            const fd = applyResistance(dmgInfo.amount, dmgInfo.type, enemy.resistances || {});
            enemy.currentHp -= fd;
            log.push(`⚔️ Auto **${fd}**`);
            addUltimateCharge(combat, run.character, data?.ultimate?.chargeOnAttack || 18);
          }

          if (enemy.currentHp <= 0) {
            enemy.currentHp = 0;
            break;
          }
          enemyHitPlayer(run, combat, enemy, log);
          if (run.hp <= 0) break;
          combat.turn += 1;
          tickCombatMeta(combat);
          combat.enemy = enemy;
        }

        combat.log = log.slice(-15);
        run.combat = combat;
        run.markModified('combat');

        if (run.hp <= 0) {
          await run.save();
          const def = await handleRunDefeat(run, interaction, log);
          return interaction.editReply({ embeds: [def.embed || def], components: def.components || [] });
        }
        if (combat.enemy.currentHp <= 0) return finishCombatWin(run, combat, combat.enemy);

        await run.save();
        return interaction.editReply({
          content: `🔄 Auto ${safety} lượt.`,
          embeds: [createCombatEmbed(run, combat)],
          components: createCombatButtons(run, false)
        });
      }

      if (action === 'combat_stop_auto') {
        const run = await Run.findOne({ userId: interaction.user.id, status: 'active' });
        if (!run?.combat) return;
        run.combat.isAuto = false;
        run.markModified('combat');
        await run.save();
        return interaction.editReply({
          content: 'Đã tắt Auto.',
          embeds: [createCombatEmbed(run, run.combat)],
          components: createCombatButtons(run, false)
        });
      }

      // ---------- PvP queue ----------
      if (action === 'pvp_select_build') {
        const buildIndex = parseInt(value, 10);
        const userId = interaction.user.id;
        const user = await User.findOne({ discordId: userId });
        if (!user?.savedBuilds?.[buildIndex]) {
          return interaction.followUp({ content: 'Build không hợp lệ.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
        if (getMatchByUser(userId)) {
          return interaction.followUp({ content: 'Đang trong PvP.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }

        removeFromQueue(userId);
        const myBuild = user.savedBuilds[buildIndex];
        const opponent = findOpponent(userId);

        if (!opponent) {
          const reply = await interaction.editReply({
            content: `Build **${myBuild.name}** – tìm đối thủ...`,
            embeds: [],
            components: [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('pvp_cancel_queue').setLabel('Hủy').setStyle(ButtonStyle.Secondary)
              )
            ]
          });
          addToQueue(userId, {
            build: myBuild,
            username: interaction.user.username,
            channelId: interaction.channelId,
            messageId: reply?.id
          });
          return;
        }

        removeFromQueue(opponent.id);
        const match = createMatch(
          { id: userId, username: interaction.user.username, build: myBuild },
          { id: opponent.id, username: opponent.data.username, build: opponent.data.build }
        );

        const battleMsg = await interaction.channel.send({
          content: `⚔️ **PvP:** ${interaction.user.username} vs ${opponent.data.username}\n▶️ **${interaction.user.username}**`,
          embeds: [createPvPEmbed(match)],
          components: createPvPButtons(match)
        });
        match.channelId = battleMsg.channelId;
        match.messageId = battleMsg.id;

        await interaction.editReply({
          content: `Match **${opponent.data.username}**! Xem tin trong channel.`,
          embeds: [],
          components: []
        });
        return;
      }

      if (action === 'pvp_cancel_queue') {
        removeFromQueue(interaction.user.id);
        await interaction.editReply({ content: 'Đã hủy PvP.', embeds: [], components: [] });
        return;
      }
    } catch (error) {
      console.error('Button error:', error);
      try {
        await interaction.followUp({ content: 'Lỗi khi xử lý nút.', flags: MessageFlags.Ephemeral });
      } catch (_) {}
    }
  }
};