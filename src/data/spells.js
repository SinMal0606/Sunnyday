const { readSheet } = require('./loadExcel');

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function loadSpells() {
  const rows = readSheet('spells.xlsx', 'spells');
  const map = {};

  for (const row of rows) {
    if (!row.id) continue;
    const id = String(row.id).trim();

    map[id] = {
      id,
      name: row.name || id,
      type: row.type || 'sorcery', // sorcery | incantation
      damageType: row.damageType || 'magic',
      manaCost: num(row.manaCost, 12),
      multiplier: num(row.multiplier, 1.5),
      description: row.description || ''
    };
  }

  console.log(`[spells.xlsx] loaded ${Object.keys(map).length} spells`);
  return map;
}

module.exports = loadSpells();