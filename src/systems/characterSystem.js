const characters = require('../data/characters');

function getCharacter(id) {
  return characters[id] || null;
}

function getAllCharacters() {
  return Object.values(characters);
}

function calculateStats(characterId, level = 1) {
  const char = getCharacter(characterId);
  if (!char) return null;

  const stats = {};
  for (const [key, base] of Object.entries(char.baseStats)) {
    const growth = char.growth[key] || 1;
    // Công thức đơn giản: base + growth * (level - 1)
    stats[key] = Math.floor(base + growth * (level - 1));
  }
  return stats;
}

function calculateMaxHp(vigor) {
  // Công thức tạm (sẽ balance lại sau)
  return Math.floor(100 + vigor * 12);
}

function calculateMaxMana(mind) {
  return Math.floor(40 + mind * 6);
}

function applyCharacterToRun(run, characterId) {
  const char = getCharacter(characterId);
  if (!char) throw new Error('Character not found');

  const stats = calculateStats(characterId, 1);

  run.character = characterId;
  run.stats = stats;
  run.level = 1;
  run.maxHp = calculateMaxHp(stats.vigor);
  run.hp = run.maxHp;
  run.maxMana = calculateMaxMana(stats.mind);
  run.mana = run.maxMana;

  // TODO: gán starting weapon sau (phase loot)
  return run;
}

module.exports = {
  getCharacter,
  getAllCharacters,
  calculateStats,
  calculateMaxHp,
  calculateMaxMana,
  applyCharacterToRun
};