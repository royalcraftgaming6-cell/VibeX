const { SlashCommandBuilder } = require('discord.js');
const { createNowPlayingEmbed, createPlayerButtons } = require('../../utils/embed');

module.exports = {
  name: 'nowplaying',
  description: 'Shows details and progress of the currently playing track.',
  aliases: ['np', 'current'],
  slashData: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Shows details and progress of the currently playing track.'),
  async execute(ctx) {
    const player = ctx.manager.getPlayer(ctx.guild);
    if (!player || !player.currentTrack) {
      return ctx.sendError('There is nothing currently playing.');
    }

    const embed = createNowPlayingEmbed(player.currentTrack, player);
    const components = createPlayerButtons(player);

    return ctx.reply({ embeds: [embed], components });
  }
};
