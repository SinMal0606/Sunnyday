// Hàng chờ: discordId -> { interaction, buildIndex, timestamp }
const queue = new Map();

// Match đang diễn ra: matchId -> { player1, player2, combat state... }
const matches = new Map();

function addToQueue(userId, data) {
  queue.set(userId, { ...data, timestamp: Date.now() });
}

function removeFromQueue(userId) {
  queue.delete(userId);
}

function findOpponent(userId) {
  for (const [id, data] of queue.entries()) {
    if (id !== userId) return { id, data };
  }
  return null;
}

module.exports = {
  queue,
  matches,
  addToQueue,
  removeFromQueue,
  findOpponent
};