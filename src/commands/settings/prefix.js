const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'prefix',
  description: 'Changes the command prefix for this server.',
  aliases: ['setprefix'],
  adminOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Changes the command prefix for this server.')
    .addStringOption(option =>
      option.setName('new_prefix')
        .setDescription('The new prefix (1-5 characters)')
        .setRequired(true)
    ),
  async execute(ctx) {
    let newPrefix;
    if (ctx.isSlash) {
      newPrefix = ctx.interaction.options.getString('new_prefix');
    } else {
      newPrefix = ctx.args[0];
    }

    if (!newPrefix || newPrefix.length > 5) {
      return ctx.sendError('Please specify a valid prefix between 1 and 5 characters. Example: `!prefix ?`');
    }

    db.setPrefix(ctx.guild.id, newPrefix);
    return ctx.reply({ embeds: [successEmbed(`Server prefix has been updated to: \`${newPrefix}\``)] });
  }
};
