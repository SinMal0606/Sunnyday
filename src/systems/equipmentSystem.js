const equipments = require('../data/equipments');
const spells = require('../data/spells');

function getRandomSpell(type) {
  const pool = Object.values(spells).filter(s => s.type === type);
  return pool[Math.floor(Math.random() * pool.length)];
}

function createEquipmentInstance(templateId, category) {
  const template = equipments[category]?.[templateId];
  if (!template) return null;

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

function generateRandomEquipment(lootTier = 1) {
  const categories = ['weapons', 'armors', 'staffs', 'seals'];
  const category = categories[Math.floor(Math.random() * categories.length)];

  let pool = Object.values(equipments[category] || {});

  if (lootTier <= 1) {
    pool = pool.filter(e => e.rarity === 'Common' || e.rarity === 'Uncommon');
  } else {
    pool = pool.filter(e => e.rarity !== 'Common');
  }

  if (pool.length === 0) {
    pool = Object.values(equipments[category] || {});
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