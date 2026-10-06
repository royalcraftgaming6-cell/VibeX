const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: '247',
  description: 'Toggles 24/7 voice stay mode on or off.',
  aliases: ['stay', 'alwayson'],
  adminOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('247')
    .setDescription('Toggles 24/7 voice stay mode on or off.')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Enable or disable 24/7 mode')
        .setRequired(false)
    ),
  async execute(ctx) {
    const current = db.getSettings(ctx.guild.id);
    let newState;

    if (ctx.isSlash) {
      const explicit = ctx.interaction.options.getBoolean('enabled');
      newState = explicit !== null ? explicit : !current.twenty_four_seven;
    } else {
      if (ctx.args[0]) {
        newState = ctx.args[0].toLowerCase() === 'on' || ctx.args[0].toLowerCase() === 'true';
      } else {
        newState = !current.twenty_four_seven;
      }
    }

    db.set247(ctx.guild.id, newState);

    const player = ctx.manager.getPlayer(ctx.guild);
    if (player) {
      if (newState) {
        player.clearDisconnectTimer();
      } else if (!player.currentTrack) {
        player.startDisconnectTimer(60000);
      }
    }

    return ctx.reply({
      embeds: [
        successEmbed(`24/7 Mode is now **${newState ? 'ENABLED ✅' : 'DISABLED ❌'}**. The bot ${newState ? 'will stay in voice channel continuously' : 'will disconnect when inactive'}.`)
      ]
    });
  }
};
