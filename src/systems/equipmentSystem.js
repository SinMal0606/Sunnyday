const equipments = require('../data/equipments');
const spells = require('../data/spells');

function getRandomSpell(type) {
  const pool = Object.values(spells).filter(s => s.type === type);
  return pool[Math.floor(Math.random() * pool.length)];
}

function createEquipmentInstance(templateId, category) {
  const template = equipments[category]?.[templateId];
  if (!template) return null;
  if (template.weaponClass) instance.weaponClass = template.weaponClass;
  if (template.defense) instance.defense = template.defense;
if (template.bonus) instance.bonus = { ...template.bonus };

  const instance = {
    id: template.id,
    name: template.name,
    type: template.type,
    rarity: template.rarity,
    description: template.description,
    uid: `${template.id}_${Date.now()}_${Math.floor(Math.random() * 9999)}`
  };

  // Copy thêm thuộc tính
  if (template.baseDamage) instance.baseDamage = template.baseDamage;
  if (template.scaling) instance.scaling = template.scaling;
  if (template.damageType) instance.damageType = template.damageType;
  if (template.status) instance.status = template.status;

  // Gắn spell cho Staff / Seal
  if (category === 'staffs') {
    const fixed = spells[template.fixedSpell];
    const random = getRandomSpell('sorcery');
    instance.spells = [fixed, random].filter(Boolean);
  }

  if (category === 'seals') {
    const fixed = spells[template.fixedSpell];
    const random = getRandomSpell('incantation');
    instance.spells = [fixed, random].filter(Boolean);
  }

  return instance;
}

function generateRandomEquipment(lootTier = 1, preferredClass = null) {
  const categories = ['weapons', 'armors', 'staffs', 'seals'];

  // 55% cơ hội ưu tiên category theo class nhân vật
  let category;
  if (preferredClass && Math.random() < 0.55) {
    if (preferredClass === 'staff') category = 'staffs';
    else if (preferredClass === 'seal') category = 'seals';
    else category = 'weapons'; // sword / greatweapon
  } else {
    category = categories[Math.floor(Math.random() * categories.length)];
  }

  let pool = Object.values(equipments[category] || {});

  if (lootTier <= 1) {
    pool = pool.filter(e => e.rarity === 'Common' || e.rarity === 'Uncommon');
  } else {
    pool = pool.filter(e => e.rarity !== 'Common');
  }
  if (pool.length === 0) {
    pool = Object.values(equipments[category] || {});
  }

  // Trong weapons: ưu tiên đúng weaponClass
  if (category === 'weapons' && preferredClass && ['sword', 'greatweapon'].includes(preferredClass)) {
    const preferredPool = pool.filter(e => e.weaponClass === preferredClass);
    if (preferredPool.length > 0 && Math.random() < 0.65) {
      pool = preferredPool;
    }
  }

  if (pool.length === 0) return null;

  const template = pool[Math.floor(Math.random() * pool.length)];
  return createEquipmentInstance(template.id, category);
}

module.exports = {
  createEquipmentInstance,
  generateRandomEquipment,
  getRandomSpell
};