const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'skip',
  description: 'Skips the currently playing track.',
  aliases: ['s', 'next'],
  voiceRequired: true,
  sameVoiceRequired: true,
  djOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skips the currently playing track.'),
  async execute(ctx) {
    const player = ctx.manager.getPlayer(ctx.guild);
    if (!player || (!player.currentTrack && player.queue.isEmpty() && !player.autoplay)) {
      return ctx.sendError('There is nothing currently playing to skip.');
    }

    player.textChannel = ctx.channel;
    const skippedTitle = player.currentTrack ? player.currentTrack.title : (player.previousTrack ? player.previousTrack.title : 'Current Track');
    player.skip();
    return ctx.reply({ embeds: [successEmbed(`Skipped **${skippedTitle}**`)] });
  }
};
