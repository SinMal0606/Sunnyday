const { readSheet } = require('./loadExcel');

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function loadEnemies() {
  const rows = readSheet('enemies.xlsx', 'enemies');
  const map = {};

  for (const row of rows) {
    if (!row.id) continue;
    const id = String(row.id).trim();
    const canApply = row.canApply ? String(row.canApply).trim() : null;

    map[id] = {
      id,
      name: row.name || id,
      emoji: row.emoji || '👾',
      hp: num(row.hp, 80),
      damage: num(row.damage, 15),
      damageType: row.damageType || 'physical',
      resistances: {
        physical: num(row.res_physical),
        fire: num(row.res_fire),
        magic: num(row.res_magic),
        lightning: num(row.res_lightning),
        holy: num(row.res_holy)
      },
      canApply: canApply || null,
      buildupAmount: num(row.buildupAmount, 0),
      runeReward: [num(row.runeMin, 40), num(row.runeMax, 65)],
      description: row.description || ''
    };
  }

  console.log(`[enemies.xlsx] loaded ${Object.keys(map).length} enemies`);
  return map;
}

module.exports = loadEnemies();