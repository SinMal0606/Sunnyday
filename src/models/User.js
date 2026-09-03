import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  discordId: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
  },
  murk: {
    type: Number,
    default: 0,
  },
  unlockedClasses: {
    type: [String],
    default: ['Wylder'], // class mặc định
  },
  // Permanent stats (cộng dồn giữa các run)
  permanentStats: {
    strength: { type: Number, default: 0 },
    dexterity: { type: Number, default: 0 },
    intelligence: { type: Number, default: 0 },
    vigor: { type: Number, default: 0 },
  },
  // Thống kê
  totalExpeditions: { type: Number, default: 0 },
  successfulExpeditions: { type: Number, default: 0 },
  nightlordKills: { type: Number, default: 0 },
  highestDayReached: { type: Number, default: 0 },
}, {
  timestamps: true,
});

export default mongoose.model('User', userSchema);