const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const commands = [];
const commandsPath = path.join(__dirname, '../commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`../commands/${file}`);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log(`Bắt đầu deploy ${commands.length} lệnh...`);

    // Deploy nhanh cho 1 server (khuyên dùng lúc dev)
    if (config.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );
      console.log('Deploy guild commands thành công.');
    } else {
      // Global commands (mất đến 1 tiếng mới hiện)
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      );
      console.log('Deploy global commands thành công.');
    }
  } catch (error) {
    console.error(error);
  }
})();