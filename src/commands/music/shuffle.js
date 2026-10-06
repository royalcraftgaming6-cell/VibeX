const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'shuffle',
  description: 'Randomizes the order of all tracks in the current queue.',
  aliases: ['shuf', 'mix'],
  voiceRequired: true,
  sameVoiceRequired: true,
  djOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Randomizes the order of all tracks in the current queue.'),
  async execute(ctx) {
    const player = ctx.manager.getPlayer(ctx.guild);
    if (!player || player.queue.size() < 2) {
      return ctx.sendError('You need at least 2 tracks in the queue to shuffle.');
    }

    player.shuffle();
    return ctx.reply({ embeds: [successEmbed(`Shuffled **${player.queue.size()}** tracks in the queue!`)] });
  }
};
