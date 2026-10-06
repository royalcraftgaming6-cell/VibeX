const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

function formatDuration(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;

  if (hrs > 0) {
    return `${hrs}:${remainingMins < 10 ? '0' : ''}${remainingMins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function createProgressBar(current, total, size = 15) {
  if (!total || total <= 0) return '🔘' + '▬'.repeat(size - 1);
  const progress = Math.min(Math.max(current / total, 0), 1);
  const filledCount = Math.round(size * progress);
  const emptyCount = Math.max(0, size - filledCount);
  return '▬'.repeat(filledCount) + '🔘' + '▬'.repeat(emptyCount);
}

function createNowPlayingEmbed(track, player) {
  const currentSec = Math.floor(player.playbackDuration / 1000);
  const totalSec = track.duration || 0;
  const progress = createProgressBar(currentSec, totalSec, 14);

  const embed = new EmbedBuilder()
    .setColor(config.colors.music)
    .setTitle(`🎵 Now Playing`)
    .setDescription(`**[${track.title}](${track.url})**\nby *${track.artist || 'Unknown Artist'}*`)
    .addFields(
      {
        name: 'Progress',
        value: `\`${formatDuration(currentSec)} / ${formatDuration(totalSec)}\`\n${progress}`,
        inline: false
      },
      {
        name: '🔊 Volume',
        value: `${player.volume}%`,
        inline: true
      },
      {
        name: '🔁 Loop',
        value: player.loopMode === 1 ? 'Track' : player.loopMode === 2 ? 'Queue' : 'Off',
        inline: true
      },
      {
        name: '📻 Autoplay',
        value: player.autoplay ? 'Enabled ✅' : 'Disabled ❌',
        inline: true
      },
      {
        name: '👤 Requested by',
        value: track.isAutoplay
          ? '📻 `Autoplay (Rythm)`'
          : `${track.requestedBy?.tag || track.requestedBy?.username || 'User'}`,
        inline: true
      }
    );

  if (track.thumbnail) {
    embed.setThumbnail(track.thumbnail);
  }

  return embed;
}

function createPlayerButtons(player) {
  const isPaused = player.isPaused;
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_pause_resume')
      .setEmoji(isPaused ? '▶️' : '⏸️')
      .setLabel(isPaused ? 'Resume' : 'Pause')
      .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_skip')
      .setEmoji('⏭️')
      .setLabel('Skip')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_stop')
      .setEmoji('⏹️')
      .setLabel('Stop')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('music_loop')
      .setEmoji('🔁')
      .setLabel('Loop')
      .setStyle(player.loopMode > 0 ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_shuffle')
      .setEmoji('🔀')
      .setLabel('Shuffle')
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_autoplay')
      .setEmoji('📻')
      .setLabel(player.autoplay ? 'Autoplay: ON' : 'Autoplay: OFF')
      .setStyle(player.autoplay ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_queue')
      .setEmoji('📜')
      .setLabel('Queue')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

function errorEmbed(message) {
  return new EmbedBuilder()
    .setColor(config.colors.error)
    .setDescription(`❌ **Error:** ${message}`);
}

function successEmbed(message) {
  return new EmbedBuilder()
    .setColor(config.colors.success)
    .setDescription(`✅ ${message}`);
}

function infoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(title)
    .setDescription(description);
}

module.exports = {
  formatDuration,
  createProgressBar,
  createNowPlayingEmbed,
  createPlayerButtons,
  errorEmbed,
  successEmbed,
  infoEmbed
};
