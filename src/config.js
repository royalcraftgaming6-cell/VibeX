require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  defaultPrefix: process.env.DEFAULT_PREFIX || '!',
  defaultVolume: parseInt(process.env.DEFAULT_VOLUME, 10) || 80,
  colors: {
    primary: 0x5865F2, // Blurple
    success: 0x57F287, // Green
    warning: 0xFEE75C, // Yellow
    error: 0xED4245,   // Red
    music: 0x9B59B6     // Purple
  },
  emojis: {
    play: '▶️',
    pause: '⏸️',
    skip: '⏭️',
    previous: '⏮️',
    stop: '⏹️',
    loop: '🔁',
    shuffle: '🔀',
    volume: '🔊',
    queue: '📜',
    musical_note: '🎵'
  }
};
