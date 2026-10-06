const CommandContext = require('../utils/context');
const { checkVoiceConditions, isDJ } = require('../utils/permissions');
const { errorEmbed } = require('../utils/embed');
const db = require('../database');
const config = require('../config');
const { PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // Retrieve guild prefix
    const settings = db.getSettings(message.guild.id);
    const prefix = settings.prefix || config.defaultPrefix;

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    if (!commandName) return;

    const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));
    if (!command) return;

    // Admin check
    if (command.adminOnly && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply({ embeds: [errorEmbed('You need Administrator permissions to use this command.')] });
    }

    // Voice conditions
    if (command.voiceRequired) {
      const check = checkVoiceConditions(message, command.sameVoiceRequired);
      if (!check.canProceed) {
        return message.reply({ embeds: [errorEmbed(check.reason)] });
      }
    }

    // DJ check
    if (command.djOnly && !isDJ(message.member)) {
      return message.reply({ embeds: [errorEmbed('You must have the DJ role to use this command!')] });
    }

    const ctx = new CommandContext({
      client,
      guild: message.guild,
      member: message.member,
      user: message.author,
      channel: message.channel,
      message,
      args
    });

    try {
      await command.execute(ctx);
    } catch (err) {
      console.error(`Error executing prefix command ${commandName}:`, err);
      message.reply({ embeds: [errorEmbed('An unexpected error occurred while executing this command.')] }).catch(() => {});
    }
  }
};
