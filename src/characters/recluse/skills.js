const data = require('./data');

function getStats(ctx) {
  return ctx.stats || ctx.run?.stats || ctx.me?.stats || {};
}

function getCombat(ctx) {
  return ctx.combat || {};
}

function magicBase(ctx) {
  const stats = getStats(ctx);
  const staff = ctx.equipped?.staff || ctx.run?.inventory?.equipped?.staff || ctx.me?.equipped?.staff;
  const intScale = staff?.scaling?.intelligence ?? 2.2;
  let base = 22 + (stats.intelligence || 10) * intScale;

  // Passive Terra Magica: +25% magic damage
  const terra = getCombat(ctx).playerBuffs?.terraMagica;
  if (terra && terra.turns > 0) {
    base *= 1 + (terra.value || 0.25);
  }

  // Class staff
  if (staff?.weaponClass === data.preferredWeaponClass) {
    base *= 1.1;
  }

  return base;
}

function variance(n) {
  return Math.floor(n * (0.88 + Math.random() * 0.24));
}

/**
 * Skill: Elemental Cocktail
 * - Magic damage
 * - Buff: elementalCocktail 2 turns (hồi mana khi gây non-physical)
 * - Passive Terra Magica 2 turns
 */
function executeSkill(ctx) {
  const base = magicBase(ctx);
  const dmg = variance(base * 1.55);

  return {
    log: [
      `🍸 **${data.skill.name}** gây **${dmg}** sát thương Magic!`,
      `✨ **Terra Magica** – +25% ST Magic (2 lượt).`,
      `🔮 **Elemental Cocktail** – gây ST không Physical sẽ hồi Mana (2 lượt).`
    ],
    damage: dmg,
    damageType: 'magic',
    effects: {
      selfBuff: {
        terraMagica: { value: 0.25, turns: 2 },
        elementalCocktail: { value: 0.2, turns: 2 } // hồi 20% maxMana mỗi proc (clamp sau)
      }
    }
  };
}

/**
 * Ultimate: Comet Azur – burn all mana
 */
function executeUltimate(ctx) {
  const stats = getStats(ctx);
  const run = ctx.run;
  const me = ctx.me;

  let currentMana = 0;
  let maxMana = 50;

  if (run) {
    currentMana = run.mana || 0;
    maxMana = run.maxMana || 50;
  } else if (me) {
    currentMana = me.mana || 0;
    maxMana = me.maxMana || 50;
  }

  const manaSpent = Math.max(currentMana, 1);
  // Đánh dấu để combat handler set mana = 0
  const int = stats.intelligence || 10;

  // ST ≈ mana tiêu * hệ số + int
  let raw = manaSpent * 1.35 + int * 2.8;
  const terra = getCombat(ctx).playerBuffs?.terraMagica;
  if (terra && terra.turns > 0) {
    raw *= 1 + (terra.value || 0.25);
  }
  const staff = ctx.equipped?.staff || run?.inventory?.equipped?.staff || me?.equipped?.staff;
  if (staff?.weaponClass === data.preferredWeaponClass) {
    raw *= 1.1;
  }

  const dmg = variance(raw);

  return {
    log: [
      `☄️ **${data.ultimate.name}**! Tiêu **${manaSpent}** Mana.`,
      `Gây **${dmg}** sát thương Magic!`
    ],
    damage: dmg,
    damageType: 'magic',
    effects: {
      spendAllMana: true
    },
    manaSpent
  };
}

module.exports = {
  data,
  executeSkill,
  executeUltimate
};