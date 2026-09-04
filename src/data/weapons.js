module.exports = [
  // ===== KIẾM =====
  {
    id: 'iron_sword',
    name: 'Iron Sword',
    type: 'sword',
    rarity: 'common',
    damageType: 'physical',
    baseDamage: 28,
    scaling: { strength: 1.1, dexterity: 0.4 },
    emoji: '⚔️'
  },
  {
    id: 'steel_sword',
    name: 'Steel Sword',
    type: 'sword',
    rarity: 'uncommon',
    damageType: 'physical',
    baseDamage: 36,
    scaling: { strength: 1.3, dexterity: 0.5 },
    emoji: '⚔️'
  },
  {
    id: 'knight_greatsword',
    name: 'Knight Greatsword',
    type: 'sword',
    rarity: 'rare',
    damageType: 'physical',
    baseDamage: 48,
    scaling: { strength: 1.6, dexterity: 0.3 },
    emoji: '🗡️'
  },

  // ===== CUNG =====
  {
    id: 'short_bow',
    name: 'Short Bow',
    type: 'bow',
    rarity: 'common',
    damageType: 'physical',
    baseDamage: 24,
    scaling: { dexterity: 1.2, strength: 0.3 },
    emoji: '🏹'
  },
  {
    id: 'longbow',
    name: 'Longbow',
    type: 'bow',
    rarity: 'uncommon',
    damageType: 'physical',
    baseDamage: 32,
    scaling: { dexterity: 1.4, strength: 0.4 },
    emoji: '🏹'
  },
  {
    id: 'pulley_bow',
    name: 'Pulley Bow',
    type: 'bow',
    rarity: 'rare',
    damageType: 'physical',
    baseDamage: 41,
    scaling: { dexterity: 1.6, strength: 0.5 },
    emoji: '🏹'
  }
];