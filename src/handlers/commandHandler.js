const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('../config');

async function loadCommands(client) {
  const commands = [];
  const commandsPath = path.join(__dirname, '../commands');
  
  // Đọc đệ quy các file command
  function readCommands(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        readCommands(filePath);
      } else if (file.endsWith('.js')) {
        const command = require(filePath);
        if (command.data && command.execute) {
          client.commands.set(command.data.name, command);
          commands.push(command.data.toJSON());
        }
      }
    }
  }
  
  readCommands(commandsPath);
  
  // Deploy commands
  const rest = new REST().setToken(config.token);
  
  try {
    console.log(`🔄 Deploying ${commands.length} commands...`);
    
    if (config.guildId) {
      // Deploy nhanh cho server test
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );
      console.log('✅ Successfully deployed guild commands.');
    } else {
      // Global commands (mất thời gian hơn)
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      );
      console.log('✅ Successfully deployed global commands.');
    }
  } catch (error) {
    console.error(error);
  }
}

async function loadEvents(client) {
  const eventsPath = path.join(__dirname, '../events');
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
}

module.exports = { loadCommands, loadEvents };