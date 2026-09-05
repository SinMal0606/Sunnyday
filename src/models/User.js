const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  username: { type: String },
  murk: { type: Number, default: 0 },
  relics: [{
    relicId: String,
    name: String,
    rarity: String,
    effects: Object,
    equipped: { type: Boolean, default: false }
  }],
  murk: { type: Number, default: 0 },
relics: [{
  relicId: String,
  name: String,
  rarity: String,
  effects: Object,
  equipped: { type: Boolean, default: false },
  obtainedAt: { type: Date, default: Date.now }
}],
  unlockedCharacters: { type: [String], default: ['wylder', 'recluse', 'ironfist', 'seer'] },
  totalRuns: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);