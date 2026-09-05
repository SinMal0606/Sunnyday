module.exports = {
  // ===== Location thường =====
  soldier_camp: {
    id: 'soldier_camp',
    name: 'Trại Lính',
    emoji: '⛺',
    types: ['fire', 'lightning'],
    lootTier: 1,
    weight: 18,           // tỉ lệ xuất hiện
    description: 'Trại lính của quân đội Nightlord. Có thể gặp địch hệ Lửa hoặc Sét.'
  },
  fortress: {
    id: 'fortress',
    name: 'Thành Trì',
    emoji: '🏰',
    types: ['physical', 'magic'],
    lootTier: 1,
    weight: 15,
    description: 'Thành trì kiên cố. Địch chủ yếu gây sát thương Vật lý và Phép.'
  },
  forge: {
    id: 'forge',
    name: 'Lò Rèn',
    emoji: '🔥',
    types: ['fire', 'lightning'],
    lootTier: 1,
    weight: 12,
    description: 'Lò rèn cổ xưa. Có cơ hội nhận vũ khí và giáp tốt.'
  },
  swamp: {
    id: 'swamp',
    name: 'Đầm Lầy',
    emoji: '🐸',
    types: ['poison', 'bleed', 'frost', 'sleep', 'rot', 'madness'],
    lootTier: 1,
    weight: 14,
    description: 'Đầm lầy độc hại. Địch có nhiều status effect nguy hiểm.'
  },
  church: {
    id: 'church',
    name: 'Nhà Thờ',
    emoji: '⛪',
    types: ['fire', 'holy', 'physical'],
    lootTier: 1,
    weight: 13,
    description: 'Nhà thờ bỏ hoang. Có thể gặp địch hệ Holy và Fire.'
  },
  ruins: {
    id: 'ruins',
    name: 'Di Tích',
    emoji: '🏛️',
    types: ['frost', 'poison', 'bleed', 'lightning', 'magic', 'holy'],
    lootTier: 1,
    weight: 14,
    description: 'Di tích cổ xưa chứa nhiều bí mật và nguy hiểm.'
  },
  mage_tower: {
    id: 'mage_tower',
    name: 'Tháp Ma Thuật',
    emoji: '🧙',
    types: ['magic'],
    lootTier: 1,
    weight: 10,
    description: 'Tháp của các pháp sư. Cơ hội nhận Staff và phép thuật.'
  },

  // ===== Location đặc biệt =====
  shop: {
    id: 'shop',
    name: 'Cửa Hàng',
    emoji: '🛒',
    types: [],
    lootTier: 0,
    weight: 8,
    special: true,
    description: 'Cửa hàng bí ẩn. Có thể mua đồ bằng Rune.'
  },
  site_of_grace: {
    id: 'site_of_grace',
    name: 'Site of Grace',
    emoji: '✨',
    types: [],
    lootTier: 0,
    weight: 9,
    special: true,
    description: 'Nơi nghỉ ngơi. Hồi đầy HP/Mana và có thể lên cấp.'
  },
  castle: {
    id: 'castle',
    name: 'Lâu Đài',
    emoji: '🏯',
    types: ['physical', 'fire', 'magic'],
    lootTier: 2,          // Tầng 1 = tier 2, tầng 2 = tier 3 (xử lý sau)
    weight: 7,
    special: true,
    description: 'Lâu đài lớn. Phần thưởng cao nhưng rất nguy hiểm.'
  }
};