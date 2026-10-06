const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'stop',
  description: 'Stops playback, clears the queue, and leaves voice.',
  aliases: ['leave', 'disconnect'],
  voiceRequired: true,
  sameVoiceRequired: true,
  djOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stops playback, clears the queue, and leaves voice.'),
  async execute(ctx) {
    const player = ctx.manager.getPlayer(ctx.guild);
    if (!player) {
      return ctx.sendError('The bot is not currently active in a voice channel.');
    }

    player.destroy();
    return ctx.reply({ embeds: [successEmbed('Stopped playback and cleared the music queue.')] });
  }
};
