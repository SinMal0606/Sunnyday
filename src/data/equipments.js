module.exports = {
  weapons: {
    iron_longsword: {
      id: 'iron_longsword',
      name: 'Iron Longsword',
      type: 'weapon',
      rarity: 'Common',
      weaponClass: 'sword',
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
      weaponClass: 'greatweapon',
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
      weaponClass: 'katana',
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
      weaponClass: 'mace',
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
    weaponClass: null,
    defense: {
      physical: 8,
      fire: 4,
      magic: 3,
      lightning: 4,
      holy: 3
    },
    bonus: {
      agility: 2
    },
    description: 'Giáp da nhẹ. +2 Agility, kháng vật lý nhẹ.'
  },
  knight_armor: {
    id: 'knight_armor',
    name: 'Knight Armor',
    type: 'armor',
    rarity: 'Uncommon',
    defense: {
      physical: 18,
      fire: 8,
      magic: 6,
      lightning: 7,
      holy: 8
    },
    bonus: {
      vigor: 3,
      strength: 2
    },
    description: 'Giáp kỵ sĩ. +3 Vigor, +2 Strength, kháng vật lý cao.'
  },
  mage_robe: {
    id: 'mage_robe',
    name: 'Mage Robe',
    type: 'armor',
    rarity: 'Uncommon',
    defense: {
      physical: 4,
      fire: 7,
      magic: 16,
      lightning: 6,
      holy: 8
    },
    bonus: {
      intelligence: 4,
      mind: 3
    },
    description: 'Áo choàng pháp sư. +4 INT, +3 Mind, kháng Magic cao.'
  },
  prophet_robe: {
    id: 'prophet_robe',
    name: 'Prophet Robe',
    type: 'armor',
    rarity: 'Uncommon',
    defense: {
      physical: 5,
      fire: 10,
      magic: 8,
      lightning: 6,
      holy: 14
    },
    bonus: {
      faith: 4,
      mind: 2
    },
    description: 'Áo choàng tiên tri. +4 Faith, +2 Mind, kháng Holy cao.'
  },
  heavy_plate: {
    id: 'heavy_plate',
    name: 'Heavy Plate',
    type: 'armor',
    rarity: 'Rare',
    defense: {
      physical: 28,
      fire: 12,
      magic: 8,
      lightning: 10,
      holy: 10
    },
    bonus: {
      vigor: 5,
      strength: 3,
      agility: -2
    },
    description: 'Giáp nặng. +5 Vigor, +3 Strength, -2 Agility.'
  }
},

  staffs: {
    glintstone_staff: {
      id: 'glintstone_staff',
      name: 'Glintstone Staff',
      type: 'staff',
      rarity: 'Common',
      weaponClass: 'staff',
      scaling: { intelligence: 1.8 },
      fixedSpell: 'glintstone_pebble',
      description: 'Trượng cơ bản.'
    },
    demi_staff: {
      id: 'demi_staff',
      name: 'Demi-Human Staff',
      type: 'staff',
      rarity: 'Uncommon',
      weaponClass: 'staff',
      scaling: { intelligence: 2.1 },
      fixedSpell: 'rock_sling',
      description: 'Trượng Demi-Human.'
    },
    carian_staff: {
      id: 'carian_staff',
      name: 'Carian Glintstone Staff',
      type: 'staff',
      rarity: 'Rare',
      weaponClass: 'staff',
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
      weaponClass: 'seal',
      scaling: { faith: 1.7 },
      fixedSpell: 'catch_flame',
      description: 'Ấn tín cơ bản.'
    },
    erdtree_seal: {
      id: 'erdtree_seal',
      name: 'Erdtree Seal',
      type: 'seal',
      rarity: 'Uncommon',
      weaponClass: 'seal',
      scaling: { faith: 2.2 },
      fixedSpell: 'flame_sling',
      description: 'Ấn tín Erdtree.'
    },
    godslayer_seal: {
      id: 'godslayer_seal',
      name: 'Godslayer Seal',
      type: 'seal',
      rarity: 'Rare',
      weaponClass: 'seal',
      scaling: { faith: 2.5 },
      fixedSpell: 'black_flame',
      description: 'Ấn tín Godskin.'
    }
  }
};