const { readSheet } = require('./loadExcel');

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function loadNightlords() {
  const rows = readSheet('nightlords.xlsx', 'nightlords');
  const map = {};

  for (const row of rows) {
    if (!row.id) continue;
    const id = String(row.id).trim();
    const canApply = row.canApply ? String(row.canApply).trim() : null;

    map[id] = {
      id,
      name: row.name || id,
      emoji: row.emoji || '🌑',
      difficulty: row.difficulty || 'Normal',
      hp: num(row.hp, 400),
      damage: num(row.damage, 40),
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
      runeReward: [num(row.runeMin, 600), num(row.runeMax, 900)],
      description: row.description || ''
    };
  }

  console.log(`[nightlords.xlsx] loaded ${Object.keys(map).length} nightlords`);
  return map;
}

module.exports = loadNightlords();