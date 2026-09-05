module.exports = {
  weapons: {
    iron_longsword: {
      id: 'iron_longsword',
      name: 'Iron Longsword',
      type: 'weapon',
      rarity: 'Common',
      damageType: 'physical',
      baseDamage: 28,
      scaling: { strength: 1.4, dexterity: 0.6 },
      description: 'Kiếm dài cơ bản. Scale Strength.'
    },
    steel_greatsword: {
      id: 'steel_greatsword',
      name: 'Steel Greatsword',
      type: 'weapon',
      rarity: 'Uncommon',
      damageType: 'physical',
      baseDamage: 38,
      scaling: { strength: 2.1, dexterity: 0.3 },
      description: 'Kiếm lớn. Scale Strength mạnh.'
    },
    blood_katana: {
      id: 'blood_katana',
      name: 'Blood Katana',
      type: 'weapon',
      rarity: 'Rare',
      damageType: 'physical',
      baseDamage: 32,
      scaling: { strength: 0.5, dexterity: 1.9 },
      status: 'bleed',
      description: 'Katana gây Bleed. Scale Dexterity.'
    },
    holy_mace: {
      id: 'holy_mace',
      name: 'Holy Mace',
      type: 'weapon',
      rarity: 'Uncommon',
      damageType: 'holy',
      baseDamage: 30,
      scaling: { strength: 1.2, faith: 1.3 },
      description: 'Chùy thánh. Scale Strength + Faith.'
    }
  },

  armors: {
    leather_armor: {
      id: 'leather_armor',
      name: 'Leather Armor',
      type: 'armor',
      rarity: 'Common',
      description: 'Giáp da nhẹ.'
    },
    knight_armor: {
      id: 'knight_armor',
      name: 'Knight Armor',
      type: 'armor',
      rarity: 'Uncommon',
      description: 'Giáp kỵ sĩ.'
    },
    mage_robe: {
      id: 'mage_robe',
      name: 'Mage Robe',
      type: 'armor',
      rarity: 'Uncommon',
      description: 'Áo choàng pháp sư.'
    }
  },

  staffs: {
    glintstone_staff: {
      id: 'glintstone_staff',
      name: 'Glintstone Staff',
      type: 'staff',
      rarity: 'Common',
      scaling: { intelligence: 1.8 },
      fixedSpell: 'glintstone_pebble',
      description: 'Trượng cơ bản.'
    },
    demi_staff: {
      id: 'demi_staff',
      name: 'Demi-Human Staff',
      type: 'staff',
      rarity: 'Uncommon',
      scaling: { intelligence: 2.1 },
      fixedSpell: 'rock_sling',
      description: 'Trượng Demi-Human.'
    },
    carian_staff: {
      id: 'carian_staff',
      name: 'Carian Glintstone Staff',
      type: 'staff',
      rarity: 'Rare',
      scaling: { intelligence: 2.6 },
      fixedSpell: 'carian_slicer',
      description: 'Trượng Carian.'
    }
  },

  seals: {
    finger_seal: {
      id: 'finger_seal',
      name: 'Finger Seal',
      type: 'seal',
      rarity: 'Common',
      scaling: { faith: 1.7 },
      fixedSpell: 'catch_flame',
      description: 'Ấn tín cơ bản.'
    },
    erdtree_seal: {
      id: 'erdtree_seal',
      name: 'Erdtree Seal',
      type: 'seal',
      rarity: 'Uncommon',
      scaling: { faith: 2.2 },
      fixedSpell: 'flame_sling',
      description: 'Ấn tín Erdtree.'
    },
    godslayer_seal: {
      id: 'godslayer_seal',
      name: 'Godslayer Seal',
      type: 'seal',
      rarity: 'Rare',
      scaling: { faith: 2.5 },
      fixedSpell: 'black_flame',
      description: 'Ấn tín Godskin.'
    }
  }
};