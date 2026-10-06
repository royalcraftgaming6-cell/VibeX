const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'pause',
  description: 'Pauses the currently playing track.',
  voiceRequired: true,
  sameVoiceRequired: true,
  djOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pauses the currently playing track.'),
  async execute(ctx) {
    const player = ctx.manager.getPlayer(ctx.guild);
    if (!player || !player.currentTrack) {
      return ctx.sendError('There is nothing currently playing to pause.');
    }

    if (player.isPaused) {
      return ctx.sendError('Playback is already paused. Use `/resume` to resume.');
    }

    player.pause();
    return ctx.reply({ embeds: [successEmbed('Playback has been paused.')] });
  }
};
