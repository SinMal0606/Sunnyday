const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

/**
 * Tạo embed túi đồ
 */
function createInventoryEmbed(run) {
  const inv = run.inventory || {};
  const eq = inv.equipped || {};

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
  // Reset về stats gốc của level trước khi cộng trang bị
  const { calculateStats, calculateMaxHp, calculateMaxMana } = require('./characterSystem');
  const baseStats = calculateStats(run.character, run.level);

  // Cộng thêm từ trang bị (tạm thời hardcode bonus đơn giản)
  const eq = run.inventory?.equipped || {};
  let bonus = { vigor: 0, strength: 0, dexterity: 0, intelligence: 0, faith: 0, agility: 0, mind: 0 };

  if (eq.weapon) {
    if (eq.weapon.name.includes('Strength') || eq.weapon.name.includes('Greatsword') || eq.weapon.name.includes('Hammer')) {
      bonus.strength += 3;
    } else if (eq.weapon.name.includes('Dexterity') || eq.weapon.name.includes('Katana')) {
      bonus.dexterity += 3;
    } else {
      bonus.strength += 2;
    }
  }

  if (eq.armor) {
    bonus.vigor += 2;
    bonus.strength += 1;
  }

  if (eq.staff) {
    bonus.intelligence += 4;
    bonus.mind += 2;
  }

  if (eq.seal) {
    bonus.faith += 4;
    bonus.mind += 2;
  }

  // Áp dụng
  for (const key of Object.keys(baseStats)) {
    run.stats[key] = baseStats[key] + (bonus[key] || 0);
  }

  run.maxHp = calculateMaxHp(run.stats.vigor);
  run.maxMana = calculateMaxMana(run.stats.mind);

  // Không cho HP/Mana vượt quá max mới
  run.hp = Math.min(run.hp, run.maxHp);
  run.mana = Math.min(run.mana, run.maxMana);

  return run;
}

module.exports = {
  createInventoryEmbed,
  createInventoryComponents,
  applyEquipmentStats
};