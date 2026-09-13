const wylder = require('./wylder/skills');
const recluse = require('./recluse/skills');

const registry = {
  wylder,
  recluse
  // ironfist, seer sau
};

function getCharacter(id) {
  return registry[id] || null;
}

function getCharacterData(id) {
  return registry[id]?.data || null;
}

module.exports = { registry, getCharacter, getCharacterData };