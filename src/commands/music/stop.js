const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'stop',
  description: 'Stops playback and clears the queue.',
  aliases: ['leave', 'disconnect'],
  voiceRequired: true,
  sameVoiceRequired: false,
  djOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stops playback and clears the queue.')
    .addBooleanOption(option =>
      option.setName('leave')
        .setDescription('Force the bot to disconnect from the voice channel completely')
        .setRequired(false)
    ),
  async execute(ctx) {
    const player = ctx.manager.getPlayer(ctx.guild);
    if (!player) {
      return ctx.sendError('The bot is not currently active in a voice channel.');
    }

    const settings = db.getSettings(ctx.guild.id);
    const forceLeave = ctx.isSlash
      ? ctx.interaction.options.getBoolean('leave')
      : (ctx.args[0] === 'leave' || ctx.args[0] === 'force');

    if (forceLeave || !settings.twenty_four_seven) {
      player.destroy();
      return ctx.reply({ embeds: [successEmbed('Stopped playback, cleared the queue, and left the voice channel.')] });
    }

    player.stop();
    return ctx.reply({ embeds: [successEmbed('Stopped playback and cleared the queue. The bot will stay connected 24/7.')] });
  }
};
