const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const MusicManager = require('./music/Manager');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { startKeepAliveServer } = require('./server');

let activeClient = null;

function createClient(includeMessageContent = true) {
  const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages
  ];

  if (includeMessageContent) {
    intents.push(GatewayIntentBits.MessageContent);
  }

  const client = new Client({ intents });
  client.musicManager = new MusicManager(client);
  loadCommands(client);
  loadEvents(client);
  activeClient = client;
  return client;
}

// Uncaught error handling to prevent bot crashes
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]:', reason);
});

process.on('uncaughtException', (err, origin) => {
  console.error(`[UNCAUGHT EXCEPTION] [${origin}]:`, err);
});

if (!config.token || config.token === 'your_bot_token_here') {
  console.log('\n======================================================');
  console.log('⚠️  VibeX Music Bot is ready to run!');
  console.log('Please add your Discord bot token to your .env file:');
  console.log('  DISCORD_TOKEN=your_token_here');
  console.log('  CLIENT_ID=your_client_id_here');
  console.log('======================================================\n');
} else {
  let client = createClient(true);
  startKeepAliveServer(client);

  client.login(config.token).catch(async (err) => {
    if (err.message && err.message.includes('disallowed intents')) {
      console.warn('\n⚠️ [NOTICE]: "Message Content Intent" is not enabled in Discord Developer Portal.');
      console.warn('👉 To enable prefix commands (!play, etc.), turn on "Message Content Intent" at:');
      console.warn('   https://discord.com/developers/applications -> Your Bot -> Bot tab -> Privileged Gateway Intents.');
      console.log('⚡ Starting bot in Slash Commands Mode (/play, /queue, etc.) instead...\n');

      client.destroy();
      client = createClient(false);
      await client.login(config.token).catch((fallbackErr) => {
        console.error('Failed to login to Discord:', fallbackErr.message);
      });
    } else {
      console.error('Failed to login to Discord:', err.message);
    }
  });
}
