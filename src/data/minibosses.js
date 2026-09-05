module.exports = {
  miniboss1: {
    id: 'miniboss1',
    name: 'Night Cavalier',
    emoji: '🏇',
    hp: 720,
    damage: 48,
    damageType: 'physical',
    resistances: {
      physical: 20,
      fire: 10,
      magic: 5,
      lightning: 15,
      holy: 5
    },
    speed: 12,
    canApply: null,
    runeReward: [180, 260],
    description: 'Kỵ sĩ đêm tàn bạo, Miniboss đầu tiên.'
  },
  miniboss2: {
    id: 'miniboss2',
    name: 'Crucible Knight of Night',
    emoji: '🛡️',
    hp: 1250,
    damage: 62,
    damageType: 'physical',
    resistances: {
      physical: 30,
      fire: 15,
      magic: 10,
      lightning: 10,
      holy: 20
    },
    speed: 11,
    canApply: 'bleed',
    runeReward: [320, 450],
    description: 'Kỵ sĩ Crucible bị nhiễm bóng tối. Miniboss thứ hai cực kỳ nguy hiểm.'
  }
};