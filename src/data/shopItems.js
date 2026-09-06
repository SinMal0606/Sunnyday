module.exports = [
  {
    id: 'shop_hp_potion',
    name: 'Bình Máu Lớn',
    type: 'consumable',
    price: 80,
    description: 'Hồi 40% HP tối đa khi dùng.',
    effect: { healPercent: 0.4 }
  },
  {
    id: 'shop_mana_potion',
    name: 'Bình Mana Lớn',
    type: 'consumable',
    price: 70,
    description: 'Hồi 40% Mana tối đa khi dùng.',
    effect: { manaPercent: 0.4 }
  },
  {
    id: 'shop_strength_boost',
    name: 'Thuốc Cường Lực',
    type: 'consumable',
    price: 120,
    description: '+5 Strength trong run hiện tại.',
    effect: { strength: 5 }
  },
  {
    id: 'shop_int_boost',
    name: 'Thuốc Trí Tuệ',
    type: 'consumable',
    price: 120,
    description: '+5 Intelligence trong run hiện tại.',
    effect: { intelligence: 5 }
  },
  {
    id: 'shop_faith_boost',
    name: 'Thuốc Đức Tin',
    type: 'consumable',
    price: 120,
    description: '+5 Faith trong run hiện tại.',
    effect: { faith: 5 }
  },
  {
    id: 'shop_random_weapon',
    name: 'Vũ khí Ngẫu nhiên',
    type: 'equipment',
    price: 200,
    description: 'Nhận 1 vũ khí ngẫu nhiên (Common ~ Uncommon).',
    effect: { randomEquipment: 'weapons' }
  },
  {
    id: 'shop_random_staff',
    name: 'Staff Ngẫu nhiên',
    type: 'equipment',
    price: 220,
    description: 'Nhận 1 Staff ngẫu nhiên (có spell).',
    effect: { randomEquipment: 'staffs' }
  },
  {
    id: 'shop_random_seal',
    name: 'Seal Ngẫu nhiên',
    type: 'equipment',
    price: 220,
    description: 'Nhận 1 Seal ngẫu nhiên (có spell).',
    effect: { randomEquipment: 'seals' }
  }
];