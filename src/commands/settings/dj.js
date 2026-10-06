const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'dj',
  description: 'Configures or clears the DJ role for this server.',
  aliases: ['djrole'],
  adminOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('dj')
    .setDescription('Configures or clears the DJ role for this server.')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to assign as DJ (leave empty to reset/clear)')
        .setRequired(false)
    ),
  async execute(ctx) {
    let role;
    if (ctx.isSlash) {
      role = ctx.interaction.options.getRole('role');
    } else {
      if (ctx.message.mentions.roles.size > 0) {
        role = ctx.message.mentions.roles.first();
      } else if (ctx.args[0] && ctx.args[0].toLowerCase() === 'clear') {
        role = null;
      }
    }

    if (!role) {
      db.setDJRole(ctx.guild.id, null);
      return ctx.reply({ embeds: [successEmbed('DJ role restriction cleared. Everyone can control the player.')] });
    }

    db.setDJRole(ctx.guild.id, role.id);
    return ctx.reply({ embeds: [successEmbed(`DJ role has been set to: <@&${role.id}>`)] });
  }
};
