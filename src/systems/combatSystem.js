const enemies = require('../data/enemies');
const characters = require('../data/characters');
const { getCharacter, getCharacterData } = require('../characters');
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

function ensureCombatMeta(combat) {
  if (combat.skillCooldown == null) combat.skillCooldown = 0;
  if (combat.ultimateCharge == null) combat.ultimateCharge = 0;
  if (!combat.playerBuffs) combat.playerBuffs = {};
  if (!combat.enemyDebuffs) combat.enemyDebuffs = {};
  if (!combat.playerStatus) combat.playerStatus = {};
  return combat;
}

function canUseSkill(combat) {
  return (combat.skillCooldown || 0) <= 0;
}

function canUseUltimate(combat, characterId) {
  const data = getCharacterData(characterId);
  const need = data?.ultimate?.chargeRequired || 100;
  return (combat.ultimateCharge || 0) >= need;
}

function addUltimateCharge(combat, characterId, amount) {
  const data = getCharacterData(characterId);
  const max = data?.ultimate?.chargeRequired || 100;
  combat.ultimateCharge = Math.min(max, (combat.ultimateCharge || 0) + (amount || 0));
}

function applySkillEffects(combat, effects = {}) {
  if (!effects) return;

  if (effects.selfBuff) {
    combat.playerBuffs = combat.playerBuffs || {};
    for (const [key, val] of Object.entries(effects.selfBuff)) {
      if (val && typeof val === 'object' && val.value != null) {
        combat.playerBuffs[key] = {
          value: val.value,
          turns: val.turns || 3
        };
      }
    }
  }

  if (effects.enemyDebuff) {
    combat.enemyDebuffs = combat.enemyDebuffs || {};
    Object.assign(combat.enemyDebuffs, effects.enemyDebuff);
  }

  if (effects.cleansePlayer) {
    combat.playerStatus = {};
  }
}

function tickCombatMeta(combat) {
  if (combat.skillCooldown > 0) combat.skillCooldown -= 1;

  if (combat.playerBuffs) {
    for (const key of Object.keys(combat.playerBuffs)) {
      combat.playerBuffs[key].turns -= 1;
      if (combat.playerBuffs[key].turns <= 0) delete combat.playerBuffs[key];
    }
  }

  if (combat.enemyDebuffs) {
    for (const key of Object.keys(combat.enemyDebuffs)) {
      if (combat.enemyDebuffs[key].turns != null) {
        combat.enemyDebuffs[key].turns -= 1;
        if (combat.enemyDebuffs[key].turns <= 0) delete combat.enemyDebuffs[key];
      }
    }
  }
}
function calculateEnemyDamage(enemy, run) {
  const base = enemy.damage || 25;
  const variance = 0.9 + Math.random() * 0.25;
  return Math.floor(base * variance);
}

function applyResistance(rawDamage, damageType, resistances = {}, resistPenalty = 0) {
  let res = resistances[damageType] || resistances.physical || 0;
  // Frost: -20% mọi kháng → kháng hiệu dụng giảm
  res = res * (1 - resistPenalty);
  const factor = 1 - Math.min(0.75, res / 100); // tuỳ công thức cũ của bạn
  return Math.max(1, Math.floor(rawDamage * factor));
}

function tryDodge(run) {
  const agility = run.stats?.agility || 10;
  const dodgeChance = Math.min(42, agility * 1.7);
  return Math.random() * 100 < dodgeChance;
}

// ====================== STATUS EFFECT ======================

/**
 * @param {object} statusState - statusState của target
 * @param {string} type - bleed | frost | poison | rot | madness | sleep
 * @param {number} amount - lượng build-up cộng thêm
 * @param {object} targetInfo - { maxHp, maxMana, hp, mana } để tính damage lúc proc
 * @returns {{ procced: boolean, messages: string[], instantDamage?: number, manaLoss?: number, skipTurn?: boolean }}
 */

function applyStatusBuildup(statusState, type, amount, targetInfo = {}) {
  const messages = [];
  if (!statusState || !type || !amount || amount <= 0) {
    return { procced: false, messages, instantDamage: 0, manaLoss: 0, skipTurn: false };
  }

  if (!statusState.buildup) statusState.buildup = {};
  if (!statusState.resistance) statusState.resistance = {};
  if (!statusState.active) statusState.active = {};

  statusState.buildup[type] = (statusState.buildup[type] || 0) + amount;
  const resist = statusState.resistance[type] || 100;

  // Chưa đủ → chỉ báo build-up nhẹ (optional, có thể bỏ log cho đỡ spam)
  if (statusState.buildup[type] < resist) {
    // messages.push(`(${type} ${statusState.buildup[type]}/${resist})`);
    return { procced: false, messages, instantDamage: 0, manaLoss: 0, skipTurn: false };
  }

  // ===== PROC =====
  statusState.buildup[type] = 0;
  const maxHp = targetInfo.maxHp || 100;
  const maxMana = targetInfo.maxMana || 50;

  let instantDamage = 0;
  let manaLoss = 0;
  let skipTurn = false;

  switch (type) {
    case 'bleed':
      instantDamage = Math.floor(maxHp * 0.14);
      messages.push(`🩸 **Hemorrhage!** Bleed – **${instantDamage}** ST (14% max HP)!`);
      break;

    case 'frost':
      instantDamage = Math.floor(maxHp * 0.08);
      statusState.active.frost = { turns: 3, resistPenalty: 0.2 };
      messages.push(`❄️ **Frostbite!** **${instantDamage}** ST – kháng ST **-20%** (3 turn)!`);
      break;

    case 'poison':
      statusState.active.poison = {
        turns: 5,
        tickDamage: Math.max(6, Math.floor(maxHp * 0.025))
      };
      messages.push(`☠️ **Poison!** DoT **${statusState.active.poison.tickDamage}**/turn (5 turn)`);
      break;

    case 'rot':
      statusState.active.rot = {
        turns: 5,
        tickDamage: Math.max(10, Math.floor(maxHp * 0.04))
      };
      messages.push(`🦠 **Scarlet Rot!** DoT **${statusState.active.rot.tickDamage}**/turn (5 turn)`);
      break;

    case 'madness':
      instantDamage = Math.floor(maxHp * 0.08);
      manaLoss = Math.floor(maxMana * 0.2);
      messages.push(`😵 **Madness!** **${instantDamage}** ST và mất **${manaLoss}** Mana!`);
      break;

    case 'sleep':
      statusState.active.sleep = { turns: 1 };
      skipTurn = true;
      messages.push(`😴 **Sleep!** Mất 1 lượt!`);
      break;

    default:
      break;
  }

  return { procced: true, messages, instantDamage, manaLoss, skipTurn };
}

/**
 * Tick status đang active trên 1 statusState
 * @returns {{ damage: number, messages: string[], skipTurn: boolean, resistPenalty: number }}
 */
function processStatusEffects(statusState) {
  const messages = [];
  let damage = 0;
  let skipTurn = false;
  let resistPenalty = 0;

  // Tương thích gọi kiểu cũ: processStatusEffects({ status: ... }) → bỏ qua
  if (!statusState || !statusState.active) {
    // Nếu lỡ truyền { status: { poison: 2 } } bản cũ — không crash
    if (statusState?.status) {
      return { damage: 0, messages: ['(status cũ, bỏ qua)'], skipTurn: false, resistPenalty: 0 };
    }
    return { damage: 0, messages: [], skipTurn: false, resistPenalty: 0 };
  }

  const active = statusState.active;

  if (active.poison) {
    const tick = active.poison.tickDamage || 8;
    damage += tick;
    messages.push(`☠️ Poison: **${tick}** ST (${active.poison.turns} turn)`);
    active.poison.turns -= 1;
    if (active.poison.turns <= 0) delete active.poison;
  }

  if (active.rot) {
    const tick = active.rot.tickDamage || 15;
    damage += tick;
    messages.push(`🦠 Rot: **${tick}** ST (${active.rot.turns} turn)`);
    active.rot.turns -= 1;
    if (active.rot.turns <= 0) delete active.rot;
  }

  if (active.frost) {
    resistPenalty = active.frost.resistPenalty || 0.2;
    messages.push(`❄️ Frostbite: kháng ST -${Math.floor(resistPenalty * 100)}% (${active.frost.turns} turn)`);
    active.frost.turns -= 1;
    if (active.frost.turns <= 0) delete active.frost;
  }

  if (active.sleep) {
    skipTurn = true;
    messages.push(`😴 Sleep – mất lượt!`);
    active.sleep.turns -= 1;
    if (active.sleep.turns <= 0) delete active.sleep;
  }

  return { damage, messages, skipTurn, resistPenalty };
}

module.exports.processStatusEffects = processStatusEffects;

function createStatusState(stats = {}, isPlayer = true) {
  // Player: scale nhẹ theo vigor / mind / faith
  const vigor = stats.vigor || 10;
  const mind = stats.mind || 10;
  const faith = stats.faith || 10;

  const base = isPlayer ? 90 : 80;

  return {
    resistance: {
      bleed: base + Math.floor(vigor * 1.5),
      frost: base + Math.floor(vigor * 1.2),
      poison: base + Math.floor(vigor * 1.3),
      rot: base + 15 + Math.floor(vigor * 1.4),
      madness: base + Math.floor(mind * 1.5),
      sleep: base + Math.floor(faith * 1.2)
    },
    buildup: {
      bleed: 0, frost: 0, poison: 0, rot: 0, madness: 0, sleep: 0
    },
    active: {}
  };
}

// ====================== TẠO COMBAT STATE ======================

function createCombatState(run, locationId) {
  const enemies = require('../data/enemies'); // hoặc path đúng của bạn
  const combat = createCombatState(run, locationId);

  // ★ Chọn quái theo location thay vì random full pool
  const enemyId = pickEnemyIdForLocation(locationId);
  let raw = enemies[enemyId];

  // Fallback nếu thiếu data
  if (!raw) {
    console.warn('[combat] missing enemy', enemyId, '→ soldier');
    raw = enemies.soldier || Object.values(enemies)[0];
  }

  const floor = run.locationsVisited || 1;
  const template =
    typeof scaleEnemyTemplate === 'function'
      ? scaleEnemyTemplate(raw, floor)
      : raw;

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
    buildupAmount: template.buildupAmount || 0,
    runeReward: template.runeReward || [40, 65],
    status: {},
    statusState: createStatusState({}, false)
  };

  if (template.statusResistance) {
    enemy.statusState.resistance = {
      ...enemy.statusState.resistance,
      ...template.statusResistance
    };
  }

  return {
    enemy,
    turn: 1,
    log: [
      `Trận đấu với ${enemy.emoji} **${enemy.name}** (Tầng ${floor})` +
        (enemy.canApply ? ` – có thể gây **${enemy.canApply}**` : '')
    ],
    isAuto: false,
    locationId,
    skillCooldown: 0,
    ultimateCharge: 0,
    playerBuffs: {},
    enemyDebuffs: {},
    playerStatusState: createStatusState(run.stats || {}, true),
    playerStatus: {}
  };
}

const locationEnemyMap = {
  // Đầm lầy
  swamp: ['swamp_creature', 'rot_infested', 'sleep_bat'],

  // Di tích / băng
  ruins: ['frost_mage', 'soldier', 'frost_mage'],

  // Nhà thờ
  church: ['soldier', 'mad_nobles', 'soldier'],

  // Trại lính
  camp: ['soldier', 'soldier', 'mad_nobles'],

  // Thành trì / lâu đài
  fortress: ['soldier', 'mad_nobles'],
  castle: ['soldier', 'frost_mage', 'mad_nobles'],

  // Lò rèn
  forge: ['soldier', 'soldier'],

  // Tháp ma thuật
  mage_tower: ['frost_mage', 'mad_nobles', 'frost_mage'],

  // Mặc định (shop/grace không combat)
  default: ['soldier', 'swamp_creature', 'frost_mage', 'mad_nobles']
};

function pickEnemyIdForLocation(locationId) {
  const pool = locationEnemyMap[locationId] || locationEnemyMap.default;
  return pool[Math.floor(Math.random() * pool.length)];
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

  // Khai báo need / charge / cd
  let cd = combat.skillCooldown || 0;
  let charge = combat.ultimateCharge || 0;
  let need = 100;

  try {
    const { getCharacterData } = require('../characters');
    const data = getCharacterData(run.character);
    if (data?.ultimate?.chargeRequired) {
      need = data.ultimate.chargeRequired;
    }
  } catch (_) {
    // characters module chưa có thì giữ need = 100
  }

  return new EmbedBuilder()
    .setTitle(`⚔️ Combat - ${enemy.emoji} ${enemy.name}`)
    .setColor(0xE74C3C)
    .setDescription((combat.log || []).slice(-8).join('\n') || 'Trận đấu bắt đầu!')
    .addFields(
      {
        name: `${String(run.character || 'player').toUpperCase()} (Bạn)`,
        value: `HP: ${playerHpBar} **${run.hp}/${run.maxHp}**\nMana: **${run.mana}/${run.maxMana}**`,
        inline: true
      },
      {
        name: `${enemy.name}`,
        value: `HP: ${enemyHpBar} **${Math.max(0, enemy.currentHp)}/${enemy.maxHp}**`,
        inline: true
      },
      { name: 'Turn', value: `${combat.turn || 1}`, inline: true },
      {
        name: 'Skill / Ultimate',
        value: `CD: **${cd}** | Charge: **${charge}/${need}**`,
        inline: false
      }
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

  const combat = run.combat || {};
  const data = getCharacterData(run.character);
  const cd = combat.skillCooldown || 0;
  const charge = combat.ultimateCharge || 0;
  const need = data?.ultimate?.chargeRequired || 100;

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('combat_attack')
      .setLabel('Tấn công')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('combat_skill')
      .setLabel(cd > 0 ? `Skill (${cd})` : (data?.skill?.name || 'Skill'))
      .setStyle(ButtonStyle.Primary)
      .setDisabled(cd > 0),
    new ButtonBuilder()
      .setCustomId('combat_ultimate')
      .setLabel(`Ult ${charge}/${need}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(charge < need),
    new ButtonBuilder()
      .setCustomId('combat_auto')
      .setLabel('Auto')
      .setStyle(ButtonStyle.Success)
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

/**
 * floor = số location đã đi (locationsVisited) trước hoặc sau khi vào combat
 * Dùng run.locationsVisited tại thời điểm tạo combat
 */
function getFloorScaling(floor) {
  const f = Math.max(0, floor || 0);

  // Máu / damage quái tăng theo tầng
  // Tầng 0–3: ~1.0x | tầng 10: ~1.55x | tầng 20: ~2.2x
  const hpMult = 1 + f * 0.055;
  const dmgMult = 1 + f * 0.045;

  // Rune: tầng thấp vẫn khá, tầng cao nhiều hơn
  // baseMult tầng 1 ≈ 1.35, tầng 10 ≈ 2.0, tầng 20 ≈ 2.9
  const runeMult = 1.25 + f * 0.125;

  return { hpMult, dmgMult, runeMult };
}

function scaleEnemyTemplate(template, floor) {
  const { hpMult, dmgMult, runeMult } = getFloorScaling(floor);
  const hp = Math.floor(template.hp * hpMult);
  const damage = Math.floor(template.damage * dmgMult);
  const r0 = Math.floor((template.runeReward?.[0] || 30) * runeMult);
  const r1 = Math.floor((template.runeReward?.[1] || 50) * runeMult);

  return {
    ...template,
    hp,
    damage,
    runeReward: [r0, r1]
  };
}

module.exports.getFloorScaling = getFloorScaling;
module.exports.scaleEnemyTemplate = scaleEnemyTemplate;

const User = require('../models/User');

async function handleRunDefeat(run, interaction, log = []) {
  const User = require('../models/User');
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

  run.combat = null;
  run.status = 'failed';
  run.currentPhase = 'ended';
  run.pendingBuild = true; // cho phép lưu build

  const murkGained = 15 + Math.floor((run.locationsVisited || 0) * 0.9) + Math.floor((run.level || 1) * 1.5);

  await User.findOneAndUpdate(
    { discordId: interaction.user.id },
    { $inc: { murk: murkGained, totalRuns: 1 }, lastActive: new Date() }
  );

  await run.save();

  const embed = new EmbedBuilder()
    .setTitle('💀 Bạn đã thất bại')
    .setDescription(
      (log.length > 0 ? log.slice(-8).join('\n') + '\n\n' : '') +
      `Run kết thúc. Bạn nhận **${murkGained} Murk** an ủi.\n\nBạn có muốn **lưu build** run này để PvP không?`
    )
    .setColor(0x7F8C8D)
    .addFields(
      { name: 'Location đã đi', value: `${run.locationsVisited || 0}`, inline: true },
      { name: 'Level', value: `${run.level || 1}`, inline: true },
      { name: 'Murk', value: `${murkGained}`, inline: true }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('save_build')
      .setLabel('Lưu Build run này')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('skip_save_build')
      .setLabel('Bỏ qua')
      .setStyle(ButtonStyle.Secondary)
  );

  // Trả về cả embed + components (sửa chỗ gọi hàm)
  return { embed, components: [row] };
}

function applyWeaponClassBonus(run, damage) {
  const char = characters[run.character];
  const preferred = char?.preferredWeaponClass;
  if (!preferred) return damage;

  const eq = run.inventory?.equipped || {};

  let usingPreferred = false;

  if (preferred === 'staff' && eq.staff?.weaponClass === 'staff') {
    usingPreferred = true;
  } else if (preferred === 'seal' && eq.seal?.weaponClass === 'seal') {
    usingPreferred = true;
  } else if (eq.weapon?.weaponClass === preferred) {
    usingPreferred = true;
  }

  if (usingPreferred) {
    return Math.floor(damage * 1.1); // +10%
  }
  return damage;
}

module.exports = {
  createCombatState,
  createCombatEmbed,
  createCombatButtons,
  calculatePlayerDamage,
  calculateEnemyDamage,
  applyResistance,
  tryDodge,
  applyStatusBuildup,
  processStatusEffects,
  runAutoTurn,
  handleRunDefeat,
  calculateSpellDamage,
  createCombatButtons,       
  enemies
};
module.exports.ensureCombatMeta = ensureCombatMeta;
module.exports.canUseSkill = canUseSkill;
module.exports.canUseUltimate = canUseUltimate;
module.exports.addUltimateCharge = addUltimateCharge;
module.exports.applySkillEffects = applySkillEffects;
module.exports.tickCombatMeta = tickCombatMeta;
module.exports.locationEnemyMap = locationEnemyMap;
module.exports.pickEnemyIdForLocation = pickEnemyIdForLocation;