const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');

module.exports = {
  name: 'help',
  description: 'Displays a list of available bot commands and their usage.',
  aliases: ['h', 'commands'],
  slashData: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays a list of available bot commands and their usage.'),
  async execute(ctx) {
    const settings = db.getSettings(ctx.guild.id);
    const prefix = settings.prefix || config.defaultPrefix;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🎵 VibeX — Music Bot Commands')
      .setDescription(`Professional 24/7 Discord Music Bot • Developed by **WIZARD OG**\n\nAll commands are available as both **Slash Commands** (\`/command\`) and **Prefix Commands** (\`${prefix}command\`).\n`)
      .addFields(
        {
          name: '🎵 Music Commands',
          value: [
            `\`${prefix}play <song/url>\` - Play a song or YouTube/SoundCloud stream`,
            `\`${prefix}pause\` - Pause the current playback`,
            `\`${prefix}resume\` - Resume paused playback`,
            `\`${prefix}skip\` - Skip the currently playing track`,
            `\`${prefix}stop\` - Stop music and clear the entire queue`,
            `\`${prefix}queue\` - View upcoming songs in queue`,
            `\`${prefix}nowplaying\` - Show details and progress of current song`,
            `\`${prefix}volume <1-100>\` - Adjust the player volume`,
            `\`${prefix}loop\` - Toggle loop mode (Off / Track / Queue)`,
            `\`${prefix}shuffle\` - Randomize the song queue order`
          ].join('\n')
        },
        {
          name: '⚙️ Settings & DJ (Admin)',
          value: [
            `\`${prefix}settings\` - View current server configuration`,
            `\`${prefix}prefix <new_prefix>\` - Change the bot command prefix`,
            `\`${prefix}dj <@role | clear>\` - Set or clear the required DJ role`,
            `\`${prefix}247\` - Toggle 24/7 stay-in-voice mode`
          ].join('\n')
        },
        {
          name: 'ℹ️ Information',
          value: [
            `\`${prefix}ping\` - Check websocket and bot response latency`,
            `\`${prefix}stats\` - View bot uptime, memory, and stats`,
            `\`${prefix}help\` - Show this help message`
          ].join('\n')
        }
      )
      .setFooter({ text: 'VibeX Music Bot • Developed by WIZARD OG', iconURL: ctx.client.user.displayAvatarURL() });

    await ctx.reply({ embeds: [embed] });
  }
};
