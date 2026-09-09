const wylder = require('./wylder/skills');

// Thêm nhân vật khác dần:
// const recluse = require('./recluse/skills');
// const ironfist = require('./ironfist/skills');
// const seer = require('./seer/skills');

const registry = {
  wylder
  // recluse,
  // ironfist,
  // seer
};

function getCharacter(id) {
  return registry[id] || null;
}

function getCharacterData(id) {
  return registry[id]?.data || null;
}

/** Fallback data cũ nếu chưa chuyển hết sang folder characters */
function getAllCharacterData() {
  const map = {};
  for (const [id, mod] of Object.entries(registry)) {
    map[id] = mod.data;
  }
  return map;
}

module.exports = {
  registry,
  getCharacter,
  getCharacterData,
  getAllCharacterData
};