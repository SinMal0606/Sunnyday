const mongoose = require('mongoose');

const runSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  status: { 
    type: String, 
    enum: ['active', 'completed', 'failed', 'abandoned'], 
    default: 'active' 
  },
  
  // Chọn lúc bắt đầu
  nightlord: { type: String, default: null },
  character: { type: String, default: null },
  
  // Tiến độ run
  locationsVisited: { type: Number, default: 0 },
  currentPhase: { 
    type: String, 
    enum: ['select_nightlord', 'select_character', 'exploring', 'miniboss1', 'miniboss2', 'rest', 'nightlord', 'ended'],
    default: 'select_nightlord'
  },
  
  // Stats hiện tại của nhân vật trong run
  level: { type: Number, default: 1 },
  runes: { type: Number, default: 0 },
  hp: { type: Number, default: 100 },
  maxHp: { type: Number, default: 100 },
  mana: { type: Number, default: 50 },
  maxMana: { type: Number, default: 50 },
  
  // Chỉ số gốc + bonus
  stats: {
    vigor: { type: Number, default: 10 },
    strength: { type: Number, default: 10 },
    dexterity: { type: Number, default: 10 },
    intelligence: { type: Number, default: 10 },
    faith: { type: Number, default: 10 },
    agility: { type: Number, default: 10 },
    mind: { type: Number, default: 10 }
  },
  
  // Inventory trong run
  inventory: {
    weapons: [{ type: Object }],
    armors: [{ type: Object }],
    staffs: [{ type: Object }],
    seals: [{ type: Object }],
    consumables: [{ type: Object }],
    equipped: {
      weapon: { type: Object, default: null },
      armor: { type: Object, default: null },
      staff: { type: Object, default: null },
      seal: { type: Object, default: null }
    }
  },
  
  // Lịch sử location đã đi (để debug / balance)
  locationHistory: [{ type: String }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Tự động update updatedAt
runSchema.pre('save', async function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('Run', runSchema);