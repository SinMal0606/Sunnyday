const { readSheet } = require('./loadExcel');

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function loadEquipments() {
  const weaponsRows = readSheet('equipments.xlsx', 'weapons');
  const armorsRows = readSheet('equipments.xlsx', 'armors');
  const staffsRows = readSheet('equipments.xlsx', 'staffs');
  const sealsRows = readSheet('equipments.xlsx', 'seals');

  const weapons = {};
  for (const row of weaponsRows) {
    if (!row.id) continue;
    const id = String(row.id).trim();
    weapons[id] = {
  id,
  name: row.name,
  type: 'weapon',
  rarity: row.rarity || 'Common',
  damageType: row.damageType || 'physical',
  baseDamage: num(row.baseDamage, 20),
  scaling: {
    strength: num(row.scale_strength),
    dexterity: num(row.scale_dexterity),
    faith: num(row.scale_faith)
  },
  weaponClass: row.weaponClass || null,
  status: row.status ? String(row.status).trim() : null,
  buildup: row.buildup != null && row.buildup !== '' ? num(row.buildup, 40) : null,
  description: row.description || ''
};
  }

  const armors = {};
  for (const row of armorsRows) {
    if (!row.id) continue;
    const id = String(row.id).trim();
    armors[id] = {
      id,
      name: row.name,
      type: 'armor',
      rarity: row.rarity || 'Common',
      defense: {
        physical: num(row.def_physical),
        fire: num(row.def_fire),
        magic: num(row.def_magic),
        lightning: num(row.def_lightning),
        holy: num(row.def_holy)
      },
      bonus: {
        vigor: num(row.bonus_vigor),
        strength: num(row.bonus_strength),
        dexterity: num(row.bonus_dexterity),
        intelligence: num(row.bonus_intelligence),
        faith: num(row.bonus_faith),
        agility: num(row.bonus_agility),
        mind: num(row.bonus_mind)
      },
      description: row.description || ''
    };
  }

  const staffs = {};
  for (const row of staffsRows) {
    if (!row.id) continue;
    const id = String(row.id).trim();
    staffs[id] = {
      id,
      name: row.name,
      type: 'staff',
      rarity: row.rarity || 'Common',
      scaling: { intelligence: num(row.scale_intelligence, 1.5) },
      fixedSpell: row.fixedSpell,
      weaponClass: row.weaponClass || 'staff',
      description: row.description || ''
    };
  }

  const seals = {};
  for (const row of sealsRows) {
    if (!row.id) continue;
    const id = String(row.id).trim();
    seals[id] = {
      id,
      name: row.name,
      type: 'seal',
      rarity: row.rarity || 'Common',
      scaling: { faith: num(row.scale_faith, 1.5) },
      fixedSpell: row.fixedSpell,
      weaponClass: row.weaponClass || 'seal',
      description: row.description || ''
    };
  }

  console.log(
    `[equipments.xlsx] weapons=${Object.keys(weapons).length} armors=${Object.keys(armors).length} staffs=${Object.keys(staffs).length} seals=${Object.keys(seals).length}`
  );

  return { weapons, armors, staffs, seals };
}

module.exports = loadEquipments();