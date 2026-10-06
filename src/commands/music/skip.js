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
    if (!player || !player.currentTrack) {
      return ctx.sendError('There is nothing currently playing to skip.');
    }

    const skippedTitle = player.currentTrack.title;
    player.skip();
    return ctx.reply({ embeds: [successEmbed(`Skipped **${skippedTitle}**`)] });
  }
};
