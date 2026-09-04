const weapons = require('../data/weapons');
const staffs = require('../data/staffs');
const seals = require('../data/seals');
const buffs = require('../data/buffs');
const spells = require('../data/spells');

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRarityByTier(tier) {
  if (tier === 1) return Math.random() < 0.7 ? 'common' : 'uncommon';
  if (tier === 2) return Math.random() < 0.5 ? 'uncommon' : 'rare';
  if (tier === 3) return 'rare';
  return 'common';
}

function generateWeapon(tier, forceType = null) {
  let pool = weapons.filter(w => {
    if (forceType && w.type !== forceType) return false;
    return true;
  });

  const rarity = getRarityByTier(tier);
  const filtered = pool.filter(w => w.rarity === rarity);
  const finalPool = filtered.length > 0 ? filtered : pool;

  return { ...randomFrom(finalPool) };
}

function generateStaff(tier) {
  const rarity = getRarityByTier(tier);
  const pool = staffs.filter(s => s.rarity === rarity);
  const staff = { ...(pool.length > 0 ? randomFrom(pool) : randomFrom(staffs)) };

  // Thêm 1 spell random
  const randomSpell = randomFrom(spells.filter(s => s.type === 'sorcery'));
  staff.spells = [staff.fixedSpell, randomSpell.id];
  return staff;
}

function generateSeal(tier) {
  const rarity = getRarityByTier(tier);
  const pool = seals.filter(s => s.rarity === rarity);
  const seal = { ...(pool.length > 0 ? randomFrom(pool) : randomFrom(seals)) };

  const randomSpell = randomFrom(spells.filter(s => s.type === 'incantation'));
  seal.spells = [seal.fixedSpell, randomSpell.id];
  return seal;
}

function generateBuff() {
  return { ...randomFrom(buffs) };
}

/**
 * Sinh phần thưởng cho 1 địa điểm
 * Trả về mảng các item (thường 3 slot)
 */
function generateRewards(location) {
  const rewards = [];
  const tier = location.rewardTier || 1;

  // Slot 1 & 2: trang bị
  if (location.guaranteed?.includes('seal')) {
    rewards.push(generateSeal(tier));
  } else if (location.guaranteed?.includes('bow')) {
    rewards.push(generateWeapon(tier, 'bow'));
  } else if (location.guaranteed?.includes('staff')) {
    rewards.push(generateStaff(tier));
  } else {
    // Ngẫu nhiên weapon hoặc staff/seal
    if (Math.random() < 0.6) {
      rewards.push(generateWeapon(tier));
    } else {
      rewards.push(Math.random() < 0.5 ? generateStaff(tier) : generateSeal(tier));
    }
  }

  // Slot 2 (nếu chưa đủ)
  if (rewards.length < 2) {
    rewards.push(generateWeapon(tier));
  }

  // Slot 3: luôn là Buff
  rewards.push(generateBuff());

  return rewards;
}

module.exports = {
  generateRewards,
  generateWeapon,
  generateStaff,
  generateSeal,
  generateBuff
};