const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const equipments = require('../data/equipments');
const spells = require('../data/spells');

// Danh sách trang bị tạm (sẽ thay bằng data thật sau)
const tempEquipments = [
  { id: 'iron_sword', name: 'Iron Sword', type: 'weapon', desc: 'Vũ khí cận chiến cơ bản. Scale Strength.', rarity: 'Common' },
  { id: 'leather_armor', name: 'Leather Armor', type: 'armor', desc: 'Giáp nhẹ, tăng kháng Physical nhẹ.', rarity: 'Common' },
  { id: 'glintstone_staff', name: 'Glintstone Staff', type: 'staff', desc: 'Trượng phép cơ bản. Scale Intelligence.', rarity: 'Common' },
  { id: 'finger_seal', name: 'Finger Seal', type: 'seal', desc: 'Ấn tín cơ bản. Scale Faith.', rarity: 'Common' },
  { id: 'steel_greatsword', name: 'Steel Greatsword', type: 'weapon', desc: 'Kiếm lớn, sát thương cao. Scale Strength mạnh.', rarity: 'Uncommon' },
  { id: 'knight_armor', name: 'Knight Armor', type: 'armor', desc: 'Giáp nặng, kháng Physical tốt.', rarity: 'Uncommon' },
  { id: 'demi_staff', name: 'Demi-Human Staff', type: 'staff', desc: 'Trượng tăng sát thương Magic.', rarity: 'Uncommon' },
  { id: 'godslayer_seal', name: 'Godslayer Seal', type: 'seal', desc: 'Ấn tín tăng sát thương Holy.', rarity: 'Uncommon' },
  { id: 'blood_katana', name: 'Blood Katana', type: 'weapon', desc: 'Gây Bleed. Scale Dexterity.', rarity: 'Rare' },
  { id: 'carian_staff', name: 'Carian Glintstone Staff', type: 'staff', desc: 'Trượng mạnh của Carian. Scale Intelligence cao.', rarity: 'Rare' },
];

// Buff chỉ số vĩnh viễn
const permanentBuffs = [
  { id: 'buff_vigor', name: 'Vĩnh viễn +2 Vigor', stat: 'vigor', value: 2, desc: 'Tăng máu tối đa và kháng Fire vĩnh viễn.' },
  { id: 'buff_strength', name: 'Vĩnh viễn +2 Strength', stat: 'strength', value: 2, desc: 'Tăng kháng Physical và scale vũ khí Strength.' },
  { id: 'buff_dexterity', name: 'Vĩnh viễn +2 Dexterity', stat: 'dexterity', value: 2, desc: 'Tăng kháng Lightning và scale vũ khí Dexterity.' },
  { id: 'buff_intelligence', name: 'Vĩnh viễn +2 Intelligence', stat: 'intelligence', value: 2, desc: 'Tăng kháng Magic và sức mạnh phép thuật.' },
  { id: 'buff_faith', name: 'Vĩnh viễn +2 Faith', stat: 'faith', value: 2, desc: 'Tăng kháng Holy và sức mạnh Incantation.' },
  { id: 'buff_agility', name: 'Vĩnh viễn +2 Agility', stat: 'agility', value: 2, desc: 'Tăng tỉ lệ né tránh.' },
  { id: 'buff_mind', name: 'Vĩnh viễn +2 Mind', stat: 'mind', value: 2, desc: 'Tăng Mana tối đa.' },
];

/**
 * Tạo 3 phần thưởng ngẫu nhiên
 * - 2 trang bị
 * - 1 buff chỉ số (luôn ở vị trí thứ 3)
 */
function generateRewards(lootTier = 1) {
  const equip1 = generateRandomEquipment(lootTier);
  const equip2 = generateRandomEquipment(lootTier);

  const buff = permanentBuffs[Math.floor(Math.random() * permanentBuffs.length)];

  return [
    { type: 'equipment', data: equip1 },
    { type: 'equipment', data: equip2 },
    { type: 'buff', data: buff }
  ];
}

/**
 * Tạo embed + button cho việc chọn phần thưởng
 */
function createRewardEmbed(run, locationName, rewards, gainedRunes) {
  const embed = new EmbedBuilder()
    .setTitle(`Phần thưởng - ${locationName}`)
    .setDescription(`Bạn nhận được **${gainedRunes} Rune**!\n\nHãy chọn **1** phần thưởng bên dưới:`)
    .setColor(0xF1C40F)
    .addFields(
      {
        name: `1️⃣ ${rewards[0].data.name}`,
        value: `**Loại:** ${rewards[0].data.type}\n**Độ hiếm:** ${rewards[0].data.rarity}\n${rewards[0].data.desc}`,
        inline: false
      },
      {
        name: `2️⃣ ${rewards[1].data.name}`,
        value: `**Loại:** ${rewards[1].data.type}\n**Độ hiếm:** ${rewards[1].data.rarity}\n${rewards[1].data.desc}`,
        inline: false
      },
      {
        name: `3️⃣ ${rewards[2].data.name}`,
        value: `${rewards[2].data.desc}`,
        inline: false
      },
      { name: 'HP', value: `${run.hp}/${run.maxHp}`, inline: true },
      { name: 'Mana', value: `${run.mana}/${run.maxMana}`, inline: true },
      { name: 'Runes', value: `${run.runes}`, inline: true }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('reward:0')
      .setLabel(`1. ${rewards[0].data.name}`)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('reward:1')
      .setLabel(`2. ${rewards[1].data.name}`)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('reward:2')
      .setLabel(`3. ${rewards[2].data.name}`)
      .setStyle(ButtonStyle.Success) // Buff luôn màu xanh
  );

  return { embed, row, rewards };
}

function getRandomSpell(type) {
  const pool = Object.values(spells).filter(s => s.type === type);
  return pool[Math.floor(Math.random() * pool.length)];
}

function createEquipmentInstance(templateId, category) {
  const template = equipments[category][templateId];
  if (!template) return null;

  const instance = {
    ...template,
    uid: `${template.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}` // unique id
  };

  // Nếu là Staff hoặc Seal → gắn spell
  if (category === 'staffs') {
    const fixed = spells[template.fixedSpell];
    const random = getRandomSpell('sorcery');
    instance.spells = [fixed, random];
  }

  if (category === 'seals') {
    const fixed = spells[template.fixedSpell];
    const random = getRandomSpell('incantation');
    instance.spells = [fixed, random];
  }

  return instance;
}

function generateRandomEquipment(lootTier = 1) {
  const categories = ['weapons', 'armors', 'staffs', 'seals'];
  const category = categories[Math.floor(Math.random() * categories.length)];

  let pool = Object.values(equipments[category]);

  // Lọc theo tier
  if (lootTier === 1) {
    pool = pool.filter(e => e.rarity === 'Common' || e.rarity === 'Uncommon');
  } else if (lootTier === 2) {
    pool = pool.filter(e => e.rarity !== 'Common');
  }

  if (pool.length === 0) pool = Object.values(equipments[category]);

  const template = pool[Math.floor(Math.random() * pool.length)];
  return createEquipmentInstance(template.id, category);
}

module.exports = {
  createEquipmentInstance,
  generateRandomEquipment,
  getRandomSpell,
  generateRewards,
  createRewardEmbed
};