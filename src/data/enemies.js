module.exports = {
  // ===== QUÁI THƯỜNG (Tier 1) =====
  monsters: [
    {
      id: 'soldier',
      name: 'Lính Canh',
      emoji: '💂',
      hp: 80,
      damage: 18,
      damageType: 'physical',
      resistances: {
        physical: 0.1,
        fire: 0,
        magic: 0,
        lightning: 0,
        holy: 0
      },
      agility: 8
    },
    {
      id: 'hound',
      name: 'Sói Đêm',
      emoji: '🐺',
      hp: 65,
      damage: 22,
      damageType: 'physical',
      resistances: {
        physical: 0.05,
        fire: -0.1,   // yếu lửa
        magic: 0,
        lightning: 0.1,
        holy: 0
      },
      agility: 14
    },
    {
      id: 'mage_apprentice',
      name: 'Học Việc Pháp Sư',
      emoji: '🧙',
      hp: 55,
      damage: 26,
      damageType: 'magic',
      resistances: {
        physical: 0,
        fire: 0,
        magic: 0.25,
        lightning: 0,
        holy: -0.1
      },
      agility: 10
    },
    {
      id: 'fire_camp',
      name: 'Lính Trại Lửa',
      emoji: '🔥',
      hp: 90,
      damage: 20,
      damageType: 'fire',
      resistances: {
        physical: 0.1,
        fire: 0.3,
        magic: 0,
        lightning: -0.15,
        holy: 0
      },
      agility: 7
    },
    {
      id: 'lightning_camp',
      name: 'Lính Trại Sét',
      emoji: '⚡',
      hp: 85,
      damage: 21,
      damageType: 'lightning',
      resistances: {
        physical: 0.05,
        fire: -0.1,
        magic: 0,
        lightning: 0.35,
        holy: 0
      },
      agility: 11
    }
  ],

  // ===== BOSS LÂU ĐÀI (Tier 2) =====
  castleBosses: [
    {
      id: 'castle_knight',
      name: 'Hiệp Sĩ Lâu Đài',
      emoji: '🛡️',
      hp: 220,
      damage: 32,
      damageType: 'physical',
      resistances: {
        physical: 0.25,
        fire: 0.1,
        magic: 0.05,
        lightning: 0,
        holy: 0.1
      },
      agility: 9
    }
  ]
};