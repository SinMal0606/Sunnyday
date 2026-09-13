module.exports = {
  id: 'recluse',
  name: 'Recluse',
  description: 'Pháp sư nguyên tố, thao túng mana và sát thương phép.',
  rarity: 'starter',
  preferredWeaponClass: 'staff',

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
    dexterity: 1.4,
    intelligence: 2.6,
    faith: 1.1,
    agility: 1.5,
    mind: 2.3
  },

  skill: {
    id: 'elemental_cocktail',
    name: 'Elemental Cocktail',
    description:
      'Gây sát thương Magic. Trong 2 lượt: gây ST không phải Physical sẽ hồi mana. Kích hoạt Terra Magica.',
    manaCost: 18,
    cooldown: 3,
    type: 'magic'
  },

  ultimate: {
    id: 'comet_azur',
    name: 'Comet Azur',
    description: 'Tiêu hao toàn bộ Mana, gây sát thương Magic theo mana đã tiêu và Intelligence.',
    chargeRequired: 100,
    chargeOnAttack: 12,
    chargeOnSkill: 30,
    type: 'magic'
  },

  passive: {
    id: 'terra_magica',
    name: 'Terra Magica',
    description: 'Sau khi dùng Skill: +25% sát thương Magic trong 2 lượt.'
  },

  startingWeapon: null
};