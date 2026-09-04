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
      name: 'Slash Flurry',
      description: 'Tấn công liên hoàn 3 lần, sát thương vật lý.',
      manaCost: 15,
      cooldown: 2 // tính theo turn
    },
    ultimate: {
      name: 'Blade Storm',
      description: 'Gây sát thương vật lý lớn + tăng Strength tạm thời trong 3 turn.',
      manaCost: 40,
      cooldown: 5
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
      name: 'Glintstone Pebble',
      description: 'Bắn đạn phép cơ bản.',
      manaCost: 12,
      cooldown: 1
    },
    ultimate: {
      name: 'Comet Azur',
      description: 'Bắn tia phép cực mạnh trong 2 turn.',
      manaCost: 50,
      cooldown: 6
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
      name: 'Shoulder Charge',
      description: 'Xô địch và gây sát thương vật lý + làm choáng nhẹ.',
      manaCost: 18,
      cooldown: 3
    },
    ultimate: {
      name: 'Unbreakable Stance',
      description: 'Tăng mạnh kháng tất cả và phản sát thương trong 3 turn.',
      manaCost: 45,
      cooldown: 7
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
      name: 'Heal',
      description: 'Hồi HP cho bản thân.',
      manaCost: 20,
      cooldown: 2
    },
    ultimate: {
      name: 'Lightning Spear',
      description: 'Ném giáo sét mạnh + có chance gây status.',
      manaCost: 42,
      cooldown: 5
    },
    startingWeapon: 'erdtree_seal'
  }
};