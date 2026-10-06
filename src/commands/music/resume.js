const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'resume',
  description: 'Resumes paused playback.',
  aliases: ['unpause'],
  voiceRequired: true,
  sameVoiceRequired: true,
  djOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resumes paused playback.'),
  async execute(ctx) {
    const player = ctx.manager.getPlayer(ctx.guild);
    if (!player || !player.currentTrack) {
      return ctx.sendError('There is nothing currently playing to resume.');
    }

    player.textChannel = ctx.channel;

    if (!player.isPaused && player.audioPlayer?.state?.status !== 'paused') {
      return ctx.sendError('Playback is not paused.');
    }

    player.resume();
    return ctx.reply({ embeds: [successEmbed('Playback has been resumed.')] });
  }
};
