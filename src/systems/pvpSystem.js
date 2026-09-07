const queue = new Map();   // userId -> { build, username, timestamp }
const matches = new Map(); // matchId -> match data

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
      equipped: player1.build.equipped || {}
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
      equipped: player2.build.equipped || {}
    },
    turn: 1,
    log: ['⚔️ PvP bắt đầu!'],
    currentTurn: player1.id, // player1 đi trước
    status: 'active'
  };

  matches.set(matchId, match);
  return match;
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
  endMatch
};