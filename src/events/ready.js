module.exports = {
  name: 'clientReady',   // đổi từ 'ready' thành 'clientReady'
  once: true,
  execute(client) {
    console.log(`Logged in as ${client.user.tag}`);
  },
};