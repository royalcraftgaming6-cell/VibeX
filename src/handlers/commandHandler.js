const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

function loadCommands(client) {
  client.commands = new Collection();
  client.aliases = new Collection();

  const commandsDir = path.join(__dirname, '..', 'commands');
  const categories = fs.readdirSync(commandsDir);

  for (const category of categories) {
    const categoryPath = path.join(commandsDir, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const command = require(path.join(categoryPath, file));
      if (!command.name) continue;

      command.category = category;
      client.commands.set(command.name, command);

      if (command.aliases && Array.isArray(command.aliases)) {
        for (const alias of command.aliases) {
          client.aliases.set(alias, command.name);
        }
      }
    }
  }

  console.log(`Loaded ${client.commands.size} commands across ${categories.length} categories.`);
}

module.exports = { loadCommands };
