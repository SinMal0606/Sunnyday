const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  mongoURI: process.env.MONGODB_URI,
};

// Kiểm tra thiếu biến
const missing = Object.entries(config)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  console.error('Thiếu biến môi trường:', missing.join(', '));
  console.error('Hãy kiểm tra file .env ở thư mục gốc dự án.');
  process.exit(1);
}

module.exports = config;