const { ActivityType, Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`[READY] Logged in as ${client.user.tag}!`);
    console.log(`[READY] Active in ${client.guilds.cache.size} servers.`);

    client.user.setActivity('🎵 /play | VibeX by WIZARD OG', { type: ActivityType.Custom });
  }
};
