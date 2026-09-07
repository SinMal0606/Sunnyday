const queue = new Map();   // userId -> { build, username, timestamp }
const matches = new Map(); // matchId -> match data
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function addToQueue(userId, data) {
  queue.set(userId, { ...data, timestamp: Date.now() });
}

function removeFromQueue(userId) {
  queue.delete(userId);
}

function isInQueue(userId) {
  return queue.has(userId);
}

function findOpponent(userId) {
  for (const [id, data] of queue.entries()) {
    if (id !== userId) return { id, data };
  }
  return null;
}

function createMatch(player1, player2) {
  const matchId = `pvp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const match = {
    id: matchId,
    player1: {
      id: player1.id,
      username: player1.username,
      build: player1.build,
      hp: player1.build.maxHp,
      maxHp: player1.build.maxHp,
      mana: player1.build.maxMana,
      maxMana: player1.build.maxMana,
      stats: player1.build.stats,
      equipped: player1.build.equipped || {},
      channelId: player1.channelId || null,
      messageId: player1.messageId || null
    },
    player2: {
      id: player2.id,
      username: player2.username,
      build: player2.build,
      hp: player2.build.maxHp,
      maxHp: player2.build.maxHp,
      mana: player2.build.maxMana,
      maxMana: player2.build.maxMana,
      stats: player2.build.stats,
      equipped: player2.build.equipped || {},
      channelId: player2.channelId || null,
      messageId: player2.messageId || null
    },
    turn: 1,
    log: ['⚔️ PvP bắt đầu!'],
    currentTurn: player1.id,
    status: 'active'
  };

  matches.set(matchId, match);
  return match;
}

async function updateBothPlayers(client, match) {
  const { createPvPEmbed, createPvPButtons } = module.exports;

  const players = [match.player1, match.player2];

  for (const p of players) {
    if (!p.channelId || !p.messageId) continue;

    try {
      const channel = await client.channels.fetch(p.channelId);
      if (!channel) continue;

      const message = await channel.messages.fetch(p.messageId);
      if (!message) continue;

      const isMyTurn = match.currentTurn === p.id && match.status === 'active';
      const content = match.status !== 'active'
        ? (match.winnerId === p.id ? '🎉 Bạn đã thắng!' : '💀 Bạn đã thua.')
        : (isMyTurn ? '▶️ **Đến lượt bạn!**' : `⏳ Đợi **${match.currentTurn === match.player1.id ? match.player1.username : match.player2.username}**...`);

      await message.edit({
        content,
        embeds: [createPvPEmbed(match)],
        components: match.status === 'active' ? createPvPButtons(match, p.id) : []
      });
    } catch (err) {
      console.error(`[PvP] Không update message của ${p.username}:`, err.message);
    }
  }
}

function getMatch(matchId) {
  return matches.get(matchId);
}

function getMatchByUser(userId) {
  for (const match of matches.values()) {
    if (match.status !== 'active') continue;
    if (match.player1.id === userId || match.player2.id === userId) return match;
  }
  return null;
}

function endMatch(matchId) {
  const match = matches.get(matchId);
  if (match) match.status = 'ended';
}

function createPvPEmbed(match) {
  const p1 = match.player1;
  const p2 = match.player2;
  const turnUser = match.currentTurn === p1.id ? p1 : p2;

  const bar = (cur, max) => {
    const percent = Math.max(0, Math.min(100, (cur / max) * 100));
    const filled = Math.round(percent / 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled);
  };

  return new EmbedBuilder()
    .setTitle(`⚔️ PvP – ${p1.username} vs ${p2.username}`)
    .setDescription(match.log.slice(-8).join('\n') || 'Trận đấu bắt đầu!')
    .setColor(0xE74C3C)
    .addFields(
      {
        name: `${p1.username}${match.currentTurn === p1.id ? ' ▶️' : ''}`,
        value: `HP: ${bar(p1.hp, p1.maxHp)} **${Math.max(0, p1.hp)}/${p1.maxHp}**\nMana: **${p1.mana}/${p1.maxMana}**\nLv.${p1.build.level} ${p1.build.character}`,
        inline: true
      },
      {
        name: `${p2.username}${match.currentTurn === p2.id ? ' ▶️' : ''}`,
        value: `HP: ${bar(p2.hp, p2.maxHp)} **${Math.max(0, p2.hp)}/${p2.maxHp}**\nMana: **${p2.mana}/${p2.maxMana}**\nLv.${p2.build.level} ${p2.build.character}`,
        inline: true
      },
      { name: 'Turn', value: `${match.turn} – Lượt của **${turnUser.username}**`, inline: false }
    )
    .setFooter({ text: `Match: ${match.id}` });
}

function createPvPButtons(match, userId) {
  const isMyTurn = match.currentTurn === userId;
  const disabled = !isMyTurn || match.status !== 'active';

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`pvp_action:${match.id}:attack`)
        .setLabel('Tấn công')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(`pvp_action:${match.id}:skill`)
        .setLabel('Skill')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(`pvp_action:${match.id}:ultimate`)
        .setLabel('Ultimate')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled)
    )
  ];
}

function getPlayer(match, userId) {
  if (match.player1.id === userId) return { me: match.player1, enemy: match.player2, key: 'player1' };
  if (match.player2.id === userId) return { me: match.player2, enemy: match.player1, key: 'player2' };
  return null;
}

module.exports = {
  queue,
  matches,
  addToQueue,
  removeFromQueue,
  isInQueue,
  findOpponent,
  createMatch,
  getMatch,
  getMatchByUser,
  endMatch,
  createPvPEmbed,
  createPvPButtons,
  getPlayer,
  updateBothPlayers
};