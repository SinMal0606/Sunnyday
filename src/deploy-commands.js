import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

console.log('Token loaded:', process.env.DISCORD_TOKEN ? 'Có token (bắt đầu bằng ' + process.env.DISCORD_TOKEN.slice(0, 10) + '...)' : 'KHÔNG CÓ TOKEN');
console.log('Client ID:', process.env.CLIENT_ID);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = [];
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  commands.push(command.default.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
  console.log(`Bắt đầu đăng ký ${commands.length} lệnh slash...`);

  // Dùng GUILD_ID khi đang dev (lệnh hiện ngay)
  // Khi lên production thì dùng global
  if (process.env.GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );
    console.log('✅ Đã đăng ký lệnh vào server test (guild)');
  } else {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );
    console.log('✅ Đã đăng ký lệnh global');
  }
} catch (error) {
  console.error(error);
}