const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatDuration } = require('../../utils/embed');
const config = require('../../config');

module.exports = {
  name: 'queue',
  description: 'Displays the current music queue and upcoming tracks.',
  aliases: ['q', 'list'],
  slashData: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Displays the current music queue and upcoming tracks.')
    .addIntegerOption(option =>
      option.setName('page')
        .setDescription('Page number of queue to view')
        .setMinValue(1)
    ),
  async execute(ctx) {
    const player = ctx.manager.getPlayer(ctx.guild);
    if (!player || (!player.currentTrack && player.queue.isEmpty())) {
      return ctx.sendError('The music queue is currently empty.');
    }

    let page = 1;
    if (ctx.isSlash) {
      page = ctx.interaction.options.getInteger('page') || 1;
    } else if (ctx.args[0] && !isNaN(ctx.args[0])) {
      page = parseInt(ctx.args[0], 10);
    }

    const tracks = player.queue.getAll();
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(tracks.length / pageSize));

    if (page > totalPages) page = totalPages;

    const startIndex = (page - 1) * pageSize;
    const currentBatch = tracks.slice(startIndex, startIndex + pageSize);

    let queueString = '';
    if (currentBatch.length === 0 && !player.currentTrack) {
      queueString = 'No upcoming tracks in the queue.';
    } else {
      queueString = currentBatch.map((track, i) => {
        const index = startIndex + i + 1;
        return `\`${index}.\` [${track.title}](${track.url}) • \`${formatDuration(track.duration)}\` (Requested by: <@${track.requestedBy?.id || '0'}>)`;
      }).join('\n');
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.music)
      .setTitle(`📜 Queue for ${ctx.guild.name}`)
      .setDescription(
        player.currentTrack
          ? `**Now Playing:**\n[${player.currentTrack.title}](${player.currentTrack.url}) • \`${formatDuration(player.currentTrack.duration)}\`\n\n**Upcoming Tracks:**\n${queueString || 'No upcoming tracks.'}`
          : `**Upcoming Tracks:**\n${queueString}`
      )
      .setFooter({
        text: `Page ${page}/${totalPages} • Total tracks: ${tracks.length + (player.currentTrack ? 1 : 0)} • Loop: ${player.loopMode === 1 ? 'Track' : player.loopMode === 2 ? 'Queue' : 'Off'}`
      });

    return ctx.reply({ embeds: [embed] });
  }
};
