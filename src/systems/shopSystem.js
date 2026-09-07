const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const shopItems = require('../data/shopItems');
const { generateRandomEquipment } = require('./equipmentSystem');

function createShopEmbed(run) {
  const embed = new EmbedBuilder()
    .setTitle('🛒 Cửa Hàng Bí Ẩn')
    .setDescription(`Rune hiện có: **${run.runes || 0}**\n\nChọn vật phẩm bạn muốn mua:`)
    .setColor(0x9B59B6);

  shopItems.forEach((item, index) => {
    embed.addFields({
      name: `${index + 1}. ${item.name} — ${item.price} Rune`,
      value: item.description,
      inline: false
    });
  });

  return embed;
}

function createShopButtons() {
  const buttons = shopItems.map((item, index) =>
    new ButtonBuilder()
      .setCustomId(`shop_buy:${index}`)   // ← phải có dấu :
      .setLabel(`${index + 1}. ${item.name}`.slice(0, 80))
      .setStyle(ButtonStyle.Primary)
  );

  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('shop_leave')
        .setLabel('Rời cửa hàng')
        .setStyle(ButtonStyle.Secondary)
    )
  );

  return rows;
}

async function buyItem(run, itemIndex) {
  const item = shopItems[itemIndex];
  if (!item) return { success: false, message: 'Vật phẩm không tồn tại.' };

  if ((run.runes || 0) < item.price) {
    return { success: false, message: `Không đủ Rune! Cần **${item.price}** Rune.` };
  }

  // Trừ rune
  run.runes -= item.price;

  let resultMessage = `Bạn đã mua **${item.name}**!`;

  // Xử lý hiệu ứng
  if (item.effect.healPercent) {
    // Lưu vào consumable
    if (!run.inventory.consumables) run.inventory.consumables = [];
    run.inventory.consumables.push({
      id: item.id,
      name: item.name,
      effect: item.effect
    });
    resultMessage += `\nĐã thêm vào túi đồ (Consumable).`;
  }

  if (item.effect.manaPercent) {
    if (!run.inventory.consumables) run.inventory.consumables = [];
    run.inventory.consumables.push({
      id: item.id,
      name: item.name,
      effect: item.effect
    });
    resultMessage += `\nĐã thêm vào túi đồ (Consumable).`;
  }

  if (item.effect.strength || item.effect.intelligence || item.effect.faith) {
    // Buff tạm thời trong run
    if (item.effect.strength) run.stats.strength = (run.stats.strength || 0) + item.effect.strength;
    if (item.effect.intelligence) run.stats.intelligence = (run.stats.intelligence || 0) + item.effect.intelligence;
    if (item.effect.faith) run.stats.faith = (run.stats.faith || 0) + item.effect.faith;
    resultMessage += `\nChỉ số đã được tăng.`;
  }

  if (item.effect.randomEquipment) {
    const category = item.effect.randomEquipment;
    // Tạo trang bị ngẫu nhiên theo category
    const { createEquipmentInstance } = require('./equipmentSystem');
    const equipments = require('../data/equipments');
    const pool = Object.values(equipments[category] || {});
    if (pool.length > 0) {
      const template = pool[Math.floor(Math.random() * pool.length)];
      const eq = createEquipmentInstance(template.id, category);

      if (eq.type === 'weapon') run.inventory.weapons.push(eq);
      else if (eq.type === 'staff') run.inventory.staffs.push(eq);
      else if (eq.type === 'seal') run.inventory.seals.push(eq);
      else if (eq.type === 'armor') run.inventory.armors.push(eq);

      resultMessage += `\nNhận được: **${eq.name}**`;
      if (eq.spells) {
        resultMessage += ` (${eq.spells.map(s => s.name).join(' + ')})`;
      }
    }
  }

  run.markModified('inventory');
  run.markModified('stats');

  return { success: true, message: resultMessage };
}

module.exports = {
  createShopEmbed,
  createShopButtons,
  buyItem,
  shopItems
};