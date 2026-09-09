const data = require('./data');

function getStats(ctx) {
  return ctx.stats || ctx.run?.stats || ctx.me?.stats || {};
}

function getHpRatio(ctx) {
  if (ctx.run) {
    return ctx.run.hp / Math.max(1, ctx.run.maxHp);
  }
  if (ctx.me) {
    return ctx.me.hp / Math.max(1, ctx.me.maxHp);
  }
  return 1;
}

function weaponBaseDamage(ctx) {
  const stats = getStats(ctx);
  const weapon = ctx.equipped?.weapon || ctx.run?.inventory?.equipped?.weapon || ctx.me?.equipped?.weapon;

  let base = weapon?.baseDamage || 26;
  const strScale = weapon?.scaling?.strength ?? 1.6;
  const dexScale = weapon?.scaling?.dexterity ?? 0.7;

  base += (stats.strength || 10) * strScale;
  base += (stats.dexterity || 10) * dexScale;

  // Buff Strength tạm thời từ Blade Storm
  const strBuff = ctx.combat?.playerBuffs?.strength?.value || 0;
  base += strBuff * 1.5;

  // Passive: HP < 50% → +8% physical
  let mult = 1;
  if (getHpRatio(ctx) < 0.5) {
    mult *= 1.08;
  }

  // Class vũ khí chuyên dụng
  if (weapon?.weaponClass === data.preferredWeaponClass) {
    mult *= 1.1;
  }

  return base * mult;
}

function variance(n) {
  return Math.floor(n * (0.88 + Math.random() * 0.24));
}

/**
 * Skill: Slash Flurry – 3 hit
 */
function executeSkill(ctx) {
  const base = weaponBaseDamage(ctx);
  const hits = 3;
  let total = 0;

  for (let i = 0; i < hits; i++) {
    total += variance(base * 0.55);
  }

  return {
    log: [`⚔️ **${data.skill.name}** – 3 đòn liên hoàn, tổng **${total}** sát thương Physical!`],
    damage: total,
    damageType: 'physical',
    effects: {}
  };
}

/**
 * Ultimate: Blade Storm – damage lớn + buff Strength
 */
function executeUltimate(ctx) {
  const base = weaponBaseDamage(ctx);
  const dmg = variance(base * 2.8);

  return {
    log: [
      `🌪️ **${data.ultimate.name}** gây **${dmg}** sát thương Physical!`,
      `💪 Strength **+6** trong 3 turn.`
    ],
    damage: dmg,
    damageType: 'physical',
    effects: {
      selfBuff: {
        strength: { value: 6, turns: 3 }
      }
    }
  };
}

module.exports = {
  data,
  executeSkill,
  executeUltimate
};