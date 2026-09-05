module.exports = {
  gladius: {
    id: 'gladius',
    name: 'Gladius, Beast of Night',
    description: 'Nightlord hung dữ chuyên Physical + Fire.',
    difficulty: 'Normal',
    emoji: '🐺',
    hp: 2200,
    damage: 78,
    damageType: 'physical',
    resistances: { physical: 25, fire: 35, magic: -10, lightning: 5, holy: -15 },
    canApply: null,
    runeReward: [600, 850],
    weakness: ['holy', 'magic']
  },
  libra: {
    id: 'libra',
    name: 'Libra, Creature of Night',
    description: 'Nightlord thiên về Magic và status.',
    difficulty: 'Normal',
    emoji: '🐉',
    hp: 1950,
    damage: 72,
    damageType: 'magic',
    resistances: { physical: 5, fire: 0, magic: 40, lightning: -10, holy: 15 },
    canApply: 'madness',
    runeReward: [580, 820],
    weakness: ['physical', 'lightning']
  },
  caligo: {
    id: 'caligo',
    name: 'Caligo, Miasma of Night',
    description: 'Chuyên Poison, Rot và Magic.',
    difficulty: 'Hard',
    emoji: '☁️',
    hp: 2400,
    damage: 68,
    damageType: 'magic',
    resistances: { physical: 10, fire: -20, magic: 30, lightning: 5, holy: -5 },
    canApply: 'rot',
    runeReward: [700, 950],
    weakness: ['fire', 'holy']
  },
  fulghor: {
    id: 'fulghor',
    name: 'Fulghor, Tyrant of Night',
    description: 'Nightlord cân bằng và nguy hiểm nhất.',
    difficulty: 'Very Hard',
    emoji: '👑',
    hp: 2800,
    damage: 85,
    damageType: 'physical',
    resistances: { physical: 30, fire: 20, magic: 15, lightning: 10, holy: 25 },
    canApply: 'bleed',
    runeReward: [900, 1200],
    weakness: ['lightning']
  }
};