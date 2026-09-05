const relics = require('../data/relics');

const RATES = {
  Common: 55,
  Uncommon: 28,
  Rare: 12,
  Epic: 4,
  Legendary: 1
};

function rollRarity() {
  const rand = Math.random() * 100;
  let cumulative = 0;

  for (const [rarity, rate] of Object.entries(RATES)) {
    cumulative += rate;
    if (rand <= cumulative) return rarity;
  }
  return 'Common';
}

function gachaOnce() {
  const rarity = rollRarity();
  const pool = Object.values(relics).filter(r => r.rarity === rarity);
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  return chosen;
}

function gachaMultiple(times = 1) {
  const results = [];
  for (let i = 0; i < times; i++) {
    results.push(gachaOnce());
  }
  return results;
}

module.exports = {
  gachaOnce,
  gachaMultiple,
  RATES,
  relics
};