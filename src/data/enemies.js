module.exports = {
  // ===== Enemy thường =====
  soldier: {
    id: 'soldier',
    name: 'Night Soldier',
    emoji: '🛡️',
    hp: 180,
    damage: 28,
    damageType: 'physical',
    resistances: { physical: 10, fire: 0, magic: 0, lightning: 5, holy: 0 },
    speed: 10,
    canApply: null,
    exp: 25,
    runeReward: [30, 50]
  },
  fire_mage: {
    id: 'fire_mage',
    name: 'Fire Monk',
    emoji: '🔥',
    hp: 140,
    damage: 35,
    damageType: 'fire',
    resistances: { physical: 0, fire: 25, magic: 5, lightning: 0, holy: -10 },
    speed: 12,
    canApply: null,
    exp: 30,
    runeReward: [35, 55]
  },
  swamp_creature: {
    id: 'swamp_creature',
    name: 'Swamp Creature',
    emoji: '🐸',
    hp: 200,
    damage: 22,
    damageType: 'physical',
    resistances: { physical: 5, fire: -15, magic: 0, lightning: 0, holy: 0 },
    speed: 8,
    canApply: 'poison',
    exp: 28,
    runeReward: [32, 52]
  },
  lightning_knight: {
    id: 'lightning_knight',
    name: 'Lightning Knight',
    emoji: '⚡',
    hp: 220,
    damage: 32,
    damageType: 'lightning',
    resistances: { physical: 15, fire: 0, magic: 0, lightning: 30, holy: 5 },
    speed: 11,
    canApply: null,
    exp: 35,
    runeReward: [40, 65]
  },
  church_zealot: {
    id: 'church_zealot',
    name: 'Church Zealot',
    emoji: '⛪',
    hp: 190,
    damage: 30,
    damageType: 'holy',
    resistances: { physical: 5, fire: 10, magic: 0, lightning: 0, holy: 25 },
    speed: 9,
    canApply: null,
    exp: 32,
    runeReward: [38, 58]
  },
  mage: {
    id: 'mage',
    name: 'Glintstone Mage',
    emoji: '🧙',
    hp: 130,
    damage: 40,
    damageType: 'magic',
    resistances: { physical: -5, fire: 0, magic: 30, lightning: 0, holy: 0 },
    speed: 13,
    canApply: null,
    exp: 33,
    runeReward: [36, 60]
  },

  // ===== Elite / mạnh hơn =====
  elite_knight: {
    id: 'elite_knight',
    name: 'Elite Black Knight',
    emoji: '🖤',
    hp: 380,
    damage: 45,
    damageType: 'physical',
    resistances: { physical: 25, fire: 10, magic: 5, lightning: 10, holy: 5 },
    speed: 10,
    canApply: null,
    exp: 60,
    runeReward: [70, 110]
  }
};