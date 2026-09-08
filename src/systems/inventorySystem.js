const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

/**
 * Tạo embed túi đồ
 */
function createInventoryEmbed(run) {
  const inv = run.inventory || {};
  const eq = inv.equipped || {};
  const armor = eq.armor;
let armorInfo = '*Trống*';
if (armor) {
  const def = armor.defense
    ? `DEF Phys ${armor.defense.physical || 0} | Mag ${armor.defense.magic || 0}`
    : '';
  const bon = armor.bonus
    ? Object.entries(armor.bonus).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`).join(', ')
    : '';
  armorInfo = `**${armor.name}**\n${def}\n${bon}`;
}

  const weaponText = eq.weapon ? `**${eq.weapon.name}**` : '*Trống*';
  const armorText = eq.armor ? `**${eq.armor.name}**` : '*Trống*';
  const staffText = eq.staff ? `**${eq.staff.name}**` : '*Trống*';
  const sealText = eq.seal ? `**${eq.seal.name}**` : '*Trống*';

  const embed = new EmbedBuilder()
    .setTitle('Túi đồ')
    .setColor(0x3498DB)
    .addFields(
      { name: 'Trang bị đang mặc', value: 
        `⚔️ Vũ khí: ${weaponText}\n` +
        `🛡️ Giáp: ${armorText}\n` +
        `🪄 Staff: ${staffText}\n` +
        `📿 Seal: ${sealText}`
      , inline: false },
      { name: `Vũ khí (${(inv.weapons || []).length})`, value: formatList(inv.weapons), inline: true },
      { name: `Giáp (${(inv.armors || []).length})`, value: formatList(inv.armors), inline: true },
      { name: `Staff (${(inv.staffs || []).length})`, value: formatList(inv.staffs), inline: true },
      { name: `Seal (${(inv.seals || []).length})`, value: formatList(inv.seals), inline: true },
      { name: 'HP / Mana', value: `${run.hp}/${run.maxHp} | ${run.mana}/${run.maxMana}`, inline: true },
      { name: 'Level / Runes', value: `${run.level} | ${run.runes}`, inline: true }
    );

  return embed;
}

function formatList(arr = []) {
  if (!arr || arr.length === 0) return '*Trống*';
  return arr.map((item, i) => `\`${i + 1}.\` ${item.name}`).join('\n');
}

/**
 * Tạo nút quản lý túi đồ
 */
function createInventoryComponents(run) {
  const inv = run.inventory || {};

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('inv_equip_weapon')
      .setLabel('Mặc Vũ khí')
      .setStyle(ButtonStyle.Primary)
      .setDisabled((inv.weapons || []).length === 0),
    new ButtonBuilder()
      .setCustomId('inv_equip_armor')
      .setLabel('Mặc Giáp')
      .setStyle(ButtonStyle.Primary)
      .setDisabled((inv.armors || []).length === 0),
    new ButtonBuilder()
      .setCustomId('inv_equip_staff')
      .setLabel('Mặc Staff')
      .setStyle(ButtonStyle.Primary)
      .setDisabled((inv.staffs || []).length === 0),
    new ButtonBuilder()
      .setCustomId('inv_equip_seal')
      .setLabel('Mặc Seal')
      .setStyle(ButtonStyle.Primary)
      .setDisabled((inv.seals || []).length === 0)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('inv_unequip')
      .setLabel('Tháo trang bị')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('inv_close')
      .setLabel('Đóng')
      .setStyle(ButtonStyle.Danger)
  );

  return [row1, row2];
}

/**
 * Áp dụng chỉ số từ trang bị đang mặc (cơ bản)
 */
function applyEquipmentStats(run) {
  const { calculateStats, calculateMaxHp, calculateMaxMana } = require('./characterSystem');
  const baseStats = calculateStats(run.character, run.level);

  const eq = run.inventory?.equipped || {};
  const bonus = {
    vigor: 0, strength: 0, dexterity: 0,
    intelligence: 0, faith: 0, agility: 0, mind: 0
  };

  // ---- Armor: bonus chỉ số ----
  if (eq.armor?.bonus) {
    for (const [key, val] of Object.entries(eq.armor.bonus)) {
      if (bonus[key] !== undefined) bonus[key] += val;
    }
  }

  // ---- Weapon / Staff / Seal: bonus nhẹ (nếu có) ----
  if (eq.weapon?.bonus) {
    for (const [key, val] of Object.entries(eq.weapon.bonus)) {
      if (bonus[key] !== undefined) bonus[key] += val;
    }
  }
  if (eq.staff?.bonus) {
    for (const [key, val] of Object.entries(eq.staff.bonus)) {
      if (bonus[key] !== undefined) bonus[key] += val;
    }
  }
  if (eq.seal?.bonus) {
    for (const [key, val] of Object.entries(eq.seal.bonus)) {
      if (bonus[key] !== undefined) bonus[key] += val;
    }
  }

  // Fallback cũ nếu weapon không có bonus field
  if (eq.weapon && !eq.weapon.bonus) {
    bonus.strength += 2;
  }
  if (eq.staff && !eq.staff.bonus) {
    bonus.intelligence += 3;
    bonus.mind += 1;
  }
  if (eq.seal && !eq.seal.bonus) {
    bonus.faith += 3;
    bonus.mind += 1;
  }

  for (const key of Object.keys(baseStats)) {
    run.stats[key] = baseStats[key] + (bonus[key] || 0);
  }

  // Lưu defense từ giáp để combat dùng
  run.defense = eq.armor?.defense
    ? { ...eq.armor.defense }
    : { physical: 0, fire: 0, magic: 0, lightning: 0, holy: 0 };

  run.maxHp = calculateMaxHp(run.stats.vigor);
  run.maxMana = calculateMaxMana(run.stats.mind);
  run.hp = Math.min(run.hp, run.maxHp);
  run.mana = Math.min(run.mana, run.maxMana);

  return run;
}

module.exports = {
  createInventoryEmbed,
  createInventoryComponents,
  applyEquipmentStats
};