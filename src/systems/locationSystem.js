const locations = require('../data/locations');
const minibosses = require('../data/minibosses');

function generateLocationChoices(count = 3, excludeIds = []) {
  const available = Object.values(locations).filter(loc => !excludeIds.includes(loc.id));
  const totalWeight = available.reduce((sum, loc) => sum + loc.weight, 0);

  const choices = [];
  const used = new Set();

  while (choices.length < count && used.size < available.length) {
    let random = Math.random() * totalWeight;

    for (const loc of available) {
      if (used.has(loc.id)) continue;
      random -= loc.weight;
      if (random <= 0) {
        choices.push(loc);
        used.add(loc.id);
        break;
      }
    }
  }

  while (choices.length < count) {
    const fallback = available.find(l => !used.has(l.id));
    if (!fallback) break;
    choices.push(fallback);
    used.add(fallback.id);
  }

  return choices;
}

function getSpecialEvent(locationsVisited) {
  if (locationsVisited === 15) return 'miniboss1';
  if (locationsVisited === 30) return 'miniboss2';
  if (locationsVisited > 30) return 'rest';
  return null;
}

function getMiniboss(type) {
  return minibosses[type] || null;
}

/**
 * Xử lý sự kiện khi vào một location
 * Trả về { message, runUpdate, components? }
 */
async function handleLocation(run, locationId) {
  const loc = locations[locationId];
  if (!loc) throw new Error('Location không tồn tại');

  let message = `Bạn đã đến **${loc.emoji} ${loc.name}**.\n${loc.description}\n\n`;
  const updates = {};

 // ====================== SITE OF GRACE ======================
if (locationId === 'site_of_grace') {
  return {
    message: `✨ **Site of Grace**\nBạn đã hồi đầy HP và Mana.`,
    updates: {
      hp: run.maxHp,
      mana: run.maxMana
    },
    isGrace: true,
    levelUpCost: run.level * 100
  };
}

  // ====================== SHOP ======================
  if (locationId === 'shop') {
    message += `🛒 **Cửa hàng**\nBạn có thể mua vật phẩm bằng Rune.\n(Hệ thống shop sẽ được mở rộng sau)`;

    // Tạm thời cho 1 vài món bán
    return {
      message,
      updates: {},
      isShop: true
    };
  }

// ====================== LOCATION CHIẾN ĐẤU ======================
return {
  message: `Bạn đã gặp địch tại **${loc.emoji} ${loc.name}**!`,
  updates: {},
  isCombat: true,
  startCombat: true,
  locationName: `${loc.emoji} ${loc.name}`,
  locationId: locationId,
  lootTier: loc.lootTier || 1
};
}

module.exports = {
  generateLocationChoices,
  getSpecialEvent,
  handleLocation,
  getMiniboss,
  locations
};