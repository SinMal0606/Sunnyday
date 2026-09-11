module.exports = {
  soldier: {
    id: 'soldier',
    name: 'Soldier',
    emoji: '🛡️',
    hp: 80,
    damage: 18,
    damageType: 'physical',
    resistances: { physical: 10, fire: 5, magic: 5, lightning: 5, holy: 5 },
    canApply: null,          // không gây status
    buildupAmount: 0,
    runeReward: [40, 65]
  },

  swamp_creature: {
    id: 'swamp_creature',
    name: 'Swamp Creature',
    emoji: '🐸',
    hp: 95,
    damage: 16,
    damageType: 'physical',
    resistances: { physical: 5, fire: 15, magic: 5, lightning: 0, holy: 5 },
    canApply: 'poison',
    buildupAmount: 42,
    runeReward: [45, 70]
  },

  rot_infested: {
    id: 'rot_infested',
    name: 'Rot Infested',
    emoji: '🦠',
    hp: 110,
    damage: 20,
    damageType: 'physical',
    canApply: 'rot',
    buildupAmount: 38,
    runeReward: [50, 80]
  },

  frost_mage: {
    id: 'frost_mage',
    name: 'Frost Mage',
    emoji: '❄️',
    hp: 70,
    damage: 22,
    damageType: 'magic',
    canApply: 'frost',
    buildupAmount: 40,
    runeReward: [48, 75]
  },

  mad_nobles: {
    id: 'mad_nobles',
    name: 'Mad Noble',
    emoji: '😵',
    hp: 85,
    damage: 19,
    damageType: 'magic',
    canApply: 'madness',
    buildupAmount: 36,
    runeReward: [45, 72]
  },

  sleep_bat: {
    id: 'sleep_bat',
    name: 'Sleep Bat',
    emoji: '🦇',
    hp: 60,
    damage: 14,
    damageType: 'physical',
    canApply: 'sleep',
    buildupAmount: 50,
    runeReward: [40, 60]
  }
};