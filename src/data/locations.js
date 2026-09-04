module.exports = [
  {
    id: 'church',
    name: 'Nhà thờ',
    emoji: '⛪',
    description: 'Gặp quái vật. Phần thưởng Tier 1, chắc chắn có Seal',
    encounter: 'monster',
    rewardTier: 1,
    guaranteed: ['seal'],          // chắc chắn có seal
    subtypes: null
  },
  {
    id: 'forge',
    name: 'Lò rèn',
    emoji: '🔥',
    description: 'Gặp quái vật. Phần thưởng Tier 1',
    encounter: 'monster',
    rewardTier: 1,
    guaranteed: [],
    subtypes: null
  },
  {
    id: 'fortress',
    name: 'Thành trì',
    emoji: '🏯',
    description: 'Gặp quái vật. Phần thưởng Tier 1',
    encounter: 'monster',
    rewardTier: 1,
    guaranteed: [],
    subtypes: null
  },
  {
    id: 'ruins',
    name: 'Di tích',
    emoji: '🏛️',
    description: 'Gặp quái vật. Có 3 loại: Băng, Độc, Chảy máu',
    encounter: 'monster',
    rewardTier: 1,
    guaranteed: [],
    subtypes: ['ice', 'poison', 'bleed']
  },
  {
    id: 'camp',
    name: 'Trại lính',
    emoji: '🏕️',
    description: 'Gặp quái vật. Có 2 loại: Lửa & Sét. Chắc chắn có Cung',
    encounter: 'monster',
    rewardTier: 1,
    guaranteed: ['bow'],
    subtypes: ['fire', 'lightning']
  },
  {
    id: 'castle',
    name: 'Lâu đài',
    emoji: '🏰',
    description: 'Đánh Boss tầng dưới (Tier 2). Có thể chọn lên tầng trên (Tier 3)',
    encounter: 'boss',
    rewardTier: 2,
    guaranteed: [],
    subtypes: null,
    hasUpperFloor: true
  },
  {
    id: 'magic_tower',
    name: 'Tháp ma thuật',
    emoji: '🧙',
    description: 'Nhận Staff',
    encounter: 'none',
    rewardTier: 1,
    guaranteed: ['staff'],
    subtypes: null
  },
  {
    id: 'site_of_grace',
    name: 'Site of Grace',
    emoji: '✨',
    description: 'Hồi đầy máu & mana. Dùng Rune để tăng cấp',
    encounter: 'none',
    rewardTier: 0,
    guaranteed: [],
    subtypes: null
  },
  {
    id: 'shop',
    name: 'Cửa hàng',
    emoji: '🛒',
    description: 'Mua bán vật phẩm',
    encounter: 'none',
    rewardTier: 0,
    guaranteed: [],
    subtypes: null
  }
];