const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const commands = [];
const commandsDir = path.join(__dirname, 'commands');
const categories = fs.readdirSync(commandsDir);

for (const category of categories) {
  const categoryPath = path.join(commandsDir, category);
  if (!fs.statSync(categoryPath).isDirectory()) continue;

  const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(path.join(categoryPath, file));
    if (command.slashData) {
      commands.push(command.slashData.toJSON());
    }
  }
}

if (!config.token || !config.clientId) {
  console.error('❌ Error: DISCORD_TOKEN and CLIENT_ID must be set in your .env file before deploying commands.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    const data = await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands }
    );

    console.log(`✅ Successfully reloaded ${data.length} application (/) commands globally.`);
  } catch (error) {
    console.error('Failed to register slash commands:', error);
  }
})();
