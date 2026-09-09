const { readSheet, rowsToMap } = require('./loadExcel');

function loadSpells() {
  const rows = readSheet('spells.xlsx', 'spells');
  const map = {};

  for (const row of rows) {
    if (!row.id) continue;
    map[row.id] = {
      id: String(row.id),
      name: row.name,
      type: row.type, // sorcery | incantation
      damageType: row.damageType,
      manaCost: Number(row.manaCost) || 10,
      multiplier: Number(row.multiplier) || 1.5,
      description: row.description || ''
    };
  }
  return map;
}

module.exports = loadSpells();