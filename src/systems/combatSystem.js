const enemies = require('../data/enemies');
const characters = require('../data/characters');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ====================== CÔNG THỨC SÁT THƯƠNG ======================

function calculatePlayerDamage(run, actionType = 'attack') {
  const char = characters[run.character];
  const stats = run.stats || {};
  let base = 18;
  let scaling = 0;
  let damageType = 'physical';
  let multiplier = 1;
  let hits = 1;
  let isHeal = false;
  let healAmount = 0;
  let buff = null;
  let debuffEnemy = null;

  if (actionType === 'attack') {
    const weapon = run.inventory?.equipped?.weapon;
    base = weapon ? 26 : 16;
    scaling = (stats.strength || 10) * 1.6 + (stats.dexterity || 10) * 0.7;
    damageType = 'physical';
    multiplier = 1;
  }

  if (actionType === 'skill' && char?.skill) {
    const sk = char.skill;
    base = 22;
    multiplier = sk.multiplier || 1.5;
    damageType = sk.type || 'physical';
    hits = sk.hits || 1;

    if (sk.type === 'magic') scaling = (stats.intelligence || 10) * 2.5;
    else if (sk.type === 'holy' || sk.type === 'lightning') scaling = (stats.faith || 10) * 2.3;
    else scaling = (stats.strength || 10) * 1.4 + (stats.dexterity || 10) * 1.1;

    if (sk.type === 'heal') {
      isHeal = true;
      healAmount = Math.floor(run.maxHp * (sk.healPercent || 0.25));
    }

    buff = sk.buff || null;
    debuffEnemy = sk.debuffEnemy || null;
  }

  if (actionType === 'ultimate' && char?.ultimate) {
    const ult = char.ultimate;
    base = 30;
    multiplier = ult.multiplier || 2.5;
    damageType = ult.type || 'physical';

    if (ult.type === 'magic') scaling = (stats.intelligence || 10) * 2.8;
    else if (ult.type === 'holy' || ult.type === 'lightning') scaling = (stats.faith || 10) * 2.6;
    else if (ult.type === 'buff') {
      buff = ult.buff;
      multiplier = 0;
    } else {
      scaling = (stats.strength || 10) * 2.0 + (stats.dexterity || 10) * 1.3;
    }

    if (ult.buff) buff = ult.buff;
  }

  const raw = (base + scaling) * multiplier;
  const variance = 0.88 + Math.random() * 0.24;

  return {
    amount: Math.floor(raw * variance),
    type: damageType,
    hits,
    isHeal,
    healAmount,
    buff,
    debuffEnemy
  };
}

function calculateEnemyDamage(enemy, run) {
  const base = enemy.damage || 25;
  const variance = 0.9 + Math.random() * 0.25;
  return Math.floor(base * variance);
}

function applyResistance(damage, damageType, resistances = {}) {
  const resist = resistances[damageType] || 0;
  const multiplier = 1 - (resist / 100);
  return Math.max(1, Math.floor(damage * multiplier));
}

function tryDodge(run) {
  const agility = run.stats?.agility || 10;
  const dodgeChance = Math.min(42, agility * 1.7);
  return Math.random() * 100 < dodgeChance;
}

// ====================== STATUS EFFECT ======================

function applyStatus(target, status, stacks = 1) {
  if (!target.status) target.status = {};
  if (!target.status[status]) target.status[status] = 0;
  target.status[status] += stacks;
}

function processStatusEffects(target) {
  let totalDamage = 0;
  const messages = [];

  if (!target.status) return { damage: 0, messages: [] };

  if (target.status.poison > 0) {
    const dmg = 8 + target.status.poison * 4;
    totalDamage += dmg;
    messages.push(`☠️ Poison gây ${dmg} sát thương`);
    target.status.poison -= 1;
    if (target.status.poison <= 0) delete target.status.poison;
  }

  if (target.status.bleed > 0) {
    const dmg = 12 + target.status.bleed * 6;
    totalDamage += dmg;
    messages.push(`🩸 Bleed gây ${dmg} sát thương`);
    target.status.bleed -= 1;
    if (target.status.bleed <= 0) delete target.status.bleed;
  }

  if (target.status.rot > 0) {
    const dmg = 15 + target.status.rot * 7;
    totalDamage += dmg;
    messages.push(`🦠 Rot gây ${dmg} sát thương`);
    target.status.rot -= 1;
    if (target.status.rot <= 0) delete target.status.rot;
  }

  if (target.status.frost > 0) {
    messages.push(`❄️ Bị Frost`);
    target.status.frost -= 1;
    if (target.status.frost <= 0) delete target.status.frost;
  }

  return { damage: totalDamage, messages };
}

// ====================== TẠO COMBAT STATE ======================

function createCombatState(run, locationId) {
  const enemyPool = ['soldier', 'fire_mage', 'swamp_creature', 'lightning_knight', 'church_zealot', 'mage'];
  const randomId = enemyPool[Math.floor(Math.random() * enemyPool.length)];
  const template = enemies[randomId];

  const enemy = {
    id: template.id,
    name: template.name,
    emoji: template.emoji,
    currentHp: template.hp,
    maxHp: template.hp,
    damage: template.damage,
    damageType: template.damageType,
    resistances: template.resistances || {},
    canApply: template.canApply || null,
    runeReward: template.runeReward || [30, 50],
    status: {}
  };

  return {
    enemy,
    turn: 1,
    playerStatus: {},
    log: [`Trận đấu với ${enemy.emoji} **${enemy.name}** bắt đầu!`],
    isAuto: false,
    locationId
  };
}

// ====================== EMBED & BUTTON ======================

function createBar(current, max) {
  const percent = Math.max(0, Math.min(100, (current / max) * 100));
  const filled = Math.round(percent / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function createCombatEmbed(run, combat) {
  const enemy = combat.enemy;
  const playerHpBar = createBar(run.hp, run.maxHp);
  const enemyHpBar = createBar(enemy.currentHp, enemy.maxHp);

  return new EmbedBuilder()
    .setTitle(`⚔️ Combat - ${enemy.emoji} ${enemy.name}`)
    .setColor(0xE74C3C)
    .setDescription(combat.log.slice(-8).join('\n') || 'Trận đấu bắt đầu!')
    .addFields(
      {
        name: `${(run.character || 'player').toUpperCase()} (Bạn)`,
        value: `HP: ${playerHpBar} **${run.hp}/${run.maxHp}**\nMana: **${run.mana}/${run.maxMana}**`,
        inline: true
      },
      {
        name: `${enemy.name}`,
        value: `HP: ${enemyHpBar} **${Math.max(0, enemy.currentHp)}/${enemy.maxHp}**`,
        inline: true
      },
      { name: 'Turn', value: `${combat.turn}`, inline: true }
    );
}

function createCombatButtons(run, isAuto = false) {
  if (isAuto) {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('combat_stop_auto')
          .setLabel('Dừng Auto')
          .setStyle(ButtonStyle.Danger)
      )
    ];
  }

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('combat_attack').setLabel('Tấn công').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('combat_skill').setLabel('Skill').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('combat_ultimate').setLabel('Ultimate').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('combat_auto').setLabel('Auto').setStyle(ButtonStyle.Success)
  );

  const rows = [row1];

  // Nếu đang cầm Staff hoặc Seal → hiện Spell
  const staff = run.inventory?.equipped?.staff;
  const seal = run.inventory?.equipped?.seal;

  const spellButtons = [];

  if (staff?.spells?.length >= 1) {
    spellButtons.push(
      new ButtonBuilder()
        .setCustomId('combat_spell:0')
        .setLabel(`Spell 1: ${staff.spells[0].name}`)
        .setStyle(ButtonStyle.Primary)
    );
  }
  if (staff?.spells?.length >= 2) {
    spellButtons.push(
      new ButtonBuilder()
        .setCustomId('combat_spell:1')
        .setLabel(`Spell 2: ${staff.spells[1].name}`)
        .setStyle(ButtonStyle.Primary)
    );
  }

  if (seal?.spells?.length >= 1) {
    spellButtons.push(
      new ButtonBuilder()
        .setCustomId('combat_spell:0')
        .setLabel(`Spell 1: ${seal.spells[0].name}`)
        .setStyle(ButtonStyle.Success)
    );
  }
  if (seal?.spells?.length >= 2) {
    spellButtons.push(
      new ButtonBuilder()
        .setCustomId('combat_spell:1')
        .setLabel(`Spell 2: ${seal.spells[1].name}`)
        .setStyle(ButtonStyle.Success)
    );
  }

  // Chỉ lấy tối đa 4 nút spell (Discord giới hạn)
  if (spellButtons.length > 0) {
    rows.push(new ActionRowBuilder().addComponents(spellButtons.slice(0, 4)));
  }

  return rows;
}

function calculateSpellDamage(run, spell) {
  const stats = run.stats || {};
  let scaling = 0;

  if (spell.type === 'sorcery') {
    scaling = (stats.intelligence || 10) * 2.6;
  } else if (spell.type === 'incantation') {
    scaling = (stats.faith || 10) * 2.5;
  }

  const base = 20;
  const raw = (base + scaling) * (spell.multiplier || 1.5);
  const variance = 0.88 + Math.random() * 0.24;

  return {
    amount: Math.floor(raw * variance),
    type: spell.damageType || 'magic'
  };
}

// ====================== AUTO LOGIC ======================

function runAutoTurn(run) {
  const char = characters[run.character];
  const enemy = run.combat?.enemy;
  if (!enemy) return 'combat_attack';

  const hpPercent = run.hp / run.maxHp;

  // Ưu tiên hồi máu nếu là Seer và máu thấp
  if (char?.skill?.type === 'heal' && hpPercent < 0.38 && run.mana >= (char.skill.manaCost || 20)) {
    return 'combat_skill';
  }

  // Ưu tiên Ultimate nếu mana đủ và địch còn khỏe
  if (char?.ultimate && run.mana >= (char.ultimate.manaCost || 40) && enemy.currentHp > enemy.maxHp * 0.4) {
    return 'combat_ultimate';
  }

  // Dùng Skill nếu đủ mana
  if (char?.skill && run.mana >= (char.skill.manaCost || 16)) {
    return 'combat_skill';
  }

  return 'combat_attack';
}

const User = require('../models/User');

async function handleRunDefeat(run, interaction, log = []) {
  run.combat = null;
  run.status = 'failed';
  run.currentPhase = 'ended';

  // Murk an ủi
  const murkGained = 15 + Math.floor((run.locationsVisited || 0) * 0.9) + Math.floor((run.level || 1) * 1.5);

  await User.findOneAndUpdate(
    { discordId: interaction.user.id },
    { 
      $inc: { 
        murk: murkGained, 
        totalRuns: 1 
      },
      lastActive: new Date()
    }
  );

  await run.save();

  const embed = new EmbedBuilder()
    .setTitle('💀 Bạn đã thất bại')
    .setDescription(
      (log.length > 0 ? log.slice(-8).join('\n') + '\n\n' : '') +
      `Run kết thúc.\nBạn nhận được **${murkGained} Murk** an ủi.`
    )
    .setColor(0x7F8C8D)
    .addFields(
      { name: 'Location đã đi', value: `${run.locationsVisited || 0}`, inline: true },
      { name: 'Level', value: `${run.level || 1}`, inline: true },
      { name: 'Murk nhận được', value: `${murkGained}`, inline: true }
    );

  return embed;
}

module.exports = {
  createCombatState,
  createCombatEmbed,
  createCombatButtons,
  calculatePlayerDamage,
  calculateEnemyDamage,
  applyResistance,
  tryDodge,
  applyStatus,
  processStatusEffects,
  runAutoTurn,
  handleRunDefeat,
  calculateSpellDamage,
  createCombatButtons,       
  enemies
};