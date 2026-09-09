module.exports = {
  id: 'wylder',
  name: 'Wylder',
  description: 'Chiến binh cân bằng, thích nghi nhiều tình huống.',
  rarity: 'starter',
  preferredWeaponClass: 'sword',

  baseStats: {
    vigor: 12,
    strength: 14,
    dexterity: 11,
    intelligence: 8,
    faith: 9,
    agility: 10,
    mind: 9
  },

  growth: {
    vigor: 2.1,
    strength: 2.4,
    dexterity: 1.6,
    intelligence: 1.0,
    faith: 1.2,
    agility: 1.5,
    mind: 1.3
  },

  skill: {
    id: 'slash_flurry',
    name: 'Slash Flurry',
    description: 'Tấn công liên hoàn 3 lần (mỗi lần ~55% sát thương vũ khí).',
    manaCost: 16,
    cooldown: 3,
    type: 'offense'
  },

  ultimate: {
    id: 'blade_storm',
    name: 'Blade Storm',
    description: 'Sát thương Physical lớn và tăng Strength trong 3 turn.',
    chargeRequired: 100,
    chargeOnAttack: 18,
    chargeOnSkill: 28,
    type: 'offense'
  },

  passive: {
    id: 'adaptive_combat',
    name: 'Adaptive Combat',
    description: '+8% sát thương vật lý khi HP dưới 50%.'
  },

  startingWeapon: 'iron_longsword'
};