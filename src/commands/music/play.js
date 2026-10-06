const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed, formatDuration } = require('../../utils/embed');

module.exports = {
  name: 'play',
  description: 'Plays a song from YouTube, SoundCloud, or direct audio link.',
  aliases: ['p'],
  voiceRequired: true,
  sameVoiceRequired: false,
  slashData: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Plays a song from YouTube, SoundCloud, or direct audio link.')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('The name of the song or URL to play')
        .setRequired(true)
    ),
  async execute(ctx) {
    let query;
    if (ctx.isSlash) {
      query = ctx.interaction.options.getString('query');
    } else {
      query = ctx.args.join(' ');
    }

    if (!query) {
      return ctx.sendError('Please provide a song name or URL to play! Example: `play shape of you`');
    }

    await ctx.defer();

    const botVoiceChannel = ctx.guild.members.me?.voice?.channel;
    const voiceChannel = ctx.member.voice?.channel || botVoiceChannel;

    if (!voiceChannel) {
      return ctx.sendError('Please join a voice channel to start playing music!');
    }

    const player = ctx.manager.getPlayer(ctx.guild, true);

    try {
      if (!player.connection || !botVoiceChannel) {
        await player.connect(voiceChannel, ctx.channel);
      }
    } catch (err) {
      console.error('Failed to connect to voice channel:', err);
      return ctx.sendError('Failed to join the voice channel. Please check my channel permissions!');
    }

    const track = await ctx.manager.resolveTrack(query, ctx.user);
    if (!track) {
      return ctx.sendError(`No tracks found matching: **${query}**`);
    }

    // If a track is already playing, add to queue
    if (player.currentTrack) {
      player.queue.add(track);
      const userTrackVibe = ctx.manager.detectMusicProfile(track.title, track.artist);
      player.sessionVibe = userTrackVibe;
      return ctx.reply({
        embeds: [
          successEmbed(`Added **[${track.title}](${track.url})** to queue (Position: **#${player.queue.size()}**) • \`${formatDuration(track.duration)}\``)
        ]
      });
    }

    // Otherwise, play immediately - reply to Discord immediately to clear thinking state
    await ctx.reply({
      embeds: [
        successEmbed(`Started playing **[${track.title}](${track.url})** in **${voiceChannel.name}**`)
      ]
    });

    player.play(track).catch(err => {
      console.error('[Play Command] Error starting player.play:', err);
    });
  }
};
