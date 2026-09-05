module.exports = {
  wylder: {
    id: 'wylder',
    name: 'Wylder',
    description: 'Một chiến binh cân bằng, thích nghi tốt với nhiều tình huống.',
    rarity: 'starter',
    baseStats: {
      vigor: 12,
      strength: 14,
      dexterity: 11,
      intelligence: 8,
      faith: 9,
      agility: 10,
      mind: 9
    },
    // Tăng chỉ số mỗi khi lên level
    growth: {
      vigor: 2.1,
      strength: 2.4,
      dexterity: 1.6,
      intelligence: 1.0,
      faith: 1.2,
      agility: 1.5,
      mind: 1.3
    },
    passive: {
      name: 'Adaptive Combat',
      description: 'Tăng 8% sát thương vật lý khi HP dưới 50%.'
    },
    skill: {
      id: 'slash_flurry',
      name: 'Slash Flurry',
      description: 'Tấn công liên hoàn 3 lần (mỗi lần 55% sát thương vũ khí).',
      manaCost: 16,
      type: 'physical',
      multiplier: 1.65, // tổng
      hits: 3
    },
    ultimate: {
      id: 'blade_storm',
      name: 'Blade Storm',
      description: 'Gây sát thương Physical lớn và tăng Strength trong 3 turn.',
      manaCost: 42,
      type: 'physical',
      multiplier: 2.8,
      buff: { stat: 'strength', value: 6, turns: 3 }
    },
    startingWeapon: 'iron_longsword'
  },

  recluse: {
    id: 'recluse',
    name: 'Recluse',
    description: 'Pháp sư thiên về Intelligence, chuyên phép thuật.',
    rarity: 'starter',
    baseStats: {
      vigor: 9,
      strength: 7,
      dexterity: 10,
      intelligence: 16,
      faith: 8,
      agility: 11,
      mind: 14
    },
    growth: {
      vigor: 1.4,
      strength: 0.9,
      dexterity: 1.5,
      intelligence: 2.8,
      faith: 1.1,
      agility: 1.7,
      mind: 2.3
    },
    passive: {
      name: 'Arcane Mind',
      description: 'Tăng 12% sát thương Magic. Giảm 10% mana cost.'
    },
    skill: {
      id: 'glintstone_pebble',
      name: 'Glintstone Pebble',
      description: 'Bắn đạn phép cơ bản, scale Intelligence.',
      manaCost: 14,
      type: 'magic',
      multiplier: 1.9
    },
    ultimate: {
      id: 'comet_azur',
      name: 'Comet Azur',
      description: 'Tia phép cực mạnh gây sát thương Magic lớn.',
      manaCost: 48,
      type: 'magic',
      multiplier: 3.4
    },
    startingWeapon: 'glintstone_staff'
  },

  ironfist: {
    id: 'ironfist',
    name: 'Ironfist',
    description: 'Tank thuần Strength, máu dày và kháng vật lý cao.',
    rarity: 'starter',
    baseStats: {
      vigor: 16,
      strength: 15,
      dexterity: 8,
      intelligence: 6,
      faith: 7,
      agility: 7,
      mind: 8
    },
    growth: {
      vigor: 2.8,
      strength: 2.6,
      dexterity: 1.1,
      intelligence: 0.7,
      faith: 0.9,
      agility: 1.0,
      mind: 1.1
    },
    passive: {
      name: 'Iron Body',
      description: 'Tăng 15% Physical Resist. Giảm 8% sát thương nhận vào khi HP đầy.'
    },
    skill: {
  id: 'shoulder_charge',
  name: 'Shoulder Charge',
  description: 'Xô địch, gây sát thương và giảm 20% sát thương địch trong 2 turn.',
  manaCost: 18,
  type: 'physical',
  multiplier: 1.7,
  debuffEnemy: { damageReduction: 0.2, turns: 2 }
},
ultimate: {
  id: 'unbreakable_stance',
  name: 'Unbreakable Stance',
  description: 'Tăng mạnh kháng + phản 30% sát thương nhận vào trong 3 turn.',
  manaCost: 45,
  type: 'buff',
  buff: { resistance: 35, reflect: 0.3, turns: 3 }
},
    startingWeapon: 'great_hammer'
  },

  seer: {
    id: 'seer',
    name: 'Seer',
    description: 'Tín đồ Faith, dùng Incantation và hỗ trợ.',
    rarity: 'starter',
    baseStats: {
      vigor: 11,
      strength: 9,
      dexterity: 9,
      intelligence: 10,
      faith: 15,
      agility: 10,
      mind: 13
    },
    growth: {
      vigor: 1.8,
      strength: 1.2,
      dexterity: 1.3,
      intelligence: 1.4,
      faith: 2.7,
      agility: 1.5,
      mind: 2.1
    },
    passive: {
      name: 'Divine Favor',
      description: 'Tăng 10% sát thương Holy. Hồi 3% max HP mỗi turn khi HP dưới 40%.'
    },
    skill: {
  id: 'heal',
  name: 'Heal',
  description: 'Hồi HP đáng kể và giải 1 status effect.',
  manaCost: 20,
  type: 'heal',
  healPercent: 0.28
},
ultimate: {
  id: 'lightning_spear',
  name: 'Lightning Spear',
  description: 'Ném giáo sét mạnh, gây sát thương Lightning + có chance gây status.',
  manaCost: 40,
  type: 'lightning',
  multiplier: 2.6,
  chanceStatus: 'lightning' // tạm
},
    startingWeapon: 'erdtree_seal'
  }
};