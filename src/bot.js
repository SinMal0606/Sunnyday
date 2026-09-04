const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const config = require('./config');
const { loadCommands, loadEvents } = require('./handlers/commandHandler'); // sẽ viết ở bước sau

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    // Thêm intents khác nếu cần sau này
  ]
});

client.commands = new Collection();

async function start() {
  try {
    // Kết nối MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB');

    // Load commands & events
    await loadCommands(client);
    await loadEvents(client);

    // Login
    await client.login(config.token);
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

start();