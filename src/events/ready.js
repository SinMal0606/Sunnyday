import { Events } from 'discord.js';

export default {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`✅ Bot đã online với tên: ${client.user.tag}`);
    client.user.setActivity('Elden Ring: Nightreign', { type: 3 }); // Watching
  },
};