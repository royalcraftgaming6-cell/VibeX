module.exports = {
  name: 'voiceStateUpdate',
  once: false,
  async execute(oldState, newState, client) {
    const guild = oldState.guild || newState.guild;
    if (!guild) return;

    const botMember = guild.members.me;
    const botId = client.user?.id;
    if (!botMember || !botId) return;

    // 1. If the bot itself was moved to another channel
    if (oldState.id === botId && newState.channelId && oldState.channelId !== newState.channelId) {
      const player = client.musicManager.getPlayer(guild);
      if (player) {
        player.voiceChannel = newState.channel;
        console.log(`[VoiceState] Bot moved to "${newState.channel.name}" in ${guild.name}. Updating player state.`);
      }
      return;
    }

    // 2. Check if a user left the channel the bot is in
    const botChannelId = botMember.voice?.channelId;
    if (!botChannelId) return;

    if (oldState.channelId === botChannelId && newState.channelId !== botChannelId) {
      const botChannel = botMember.voice.channel;
      if (!botChannel) return;

      const humanMembers = botChannel.members.filter(m => !m.user.bot);
      const player = client.musicManager.getPlayer(guild);

      if (humanMembers.size === 0) {
        console.log(`[VoiceState] All listeners left "${botChannel.name}" in ${guild.name}. Bot remaining in voice channel and continuing 24/7 continuous playback.`);
        
        // Ensure disconnect timer is never active when alone
        if (player) {
          player.clearDisconnectTimer();
          // Keep audio playing continuously without interrupting or pausing
        }
      }
    }
  }
};
