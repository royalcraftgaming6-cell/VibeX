const CommandContext = require('../utils/context');
const { checkVoiceConditions, isDJ } = require('../utils/permissions');
const { errorEmbed, successEmbed } = require('../utils/embed');
const { PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      if (!interaction.guild) {
        return interaction.reply({
          embeds: [errorEmbed('Commands can only be used in servers!')],
          ephemeral: true
        });
      }

      // Admin check
      if (command.adminOnly && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          embeds: [errorEmbed('You need Administrator permissions to use this command.')],
          ephemeral: true
        });
      }

      // Voice condition check
      if (command.voiceRequired) {
        const check = checkVoiceConditions(interaction, command.sameVoiceRequired);
        if (!check.canProceed) {
          return interaction.reply({
            embeds: [errorEmbed(check.reason)],
            ephemeral: true
          });
        }
      }

      // DJ check
      if (command.djOnly && !isDJ(interaction.member)) {
        return interaction.reply({
          embeds: [errorEmbed('You must have the DJ role to use this command!')],
          ephemeral: true
        });
      }

      const ctx = new CommandContext({
        client,
        guild: interaction.guild,
        member: interaction.member,
        user: interaction.user,
        channel: interaction.channel,
        interaction
      });

      try {
        await command.execute(ctx);
      } catch (err) {
        console.error(`Error executing slash command ${interaction.commandName}:`, err);
        const errorPayload = {
          embeds: [errorEmbed('An unexpected error occurred while executing this command.')],
          ephemeral: true
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorPayload).catch(() => {});
        } else {
          await interaction.reply(errorPayload).catch(() => {});
        }
      }
      return;
    }

    // 2. Handle Player Button Controls
    if (interaction.isButton()) {
      const customId = interaction.customId;
      if (!customId.startsWith('music_')) return;

      const player = client.musicManager.getPlayer(interaction.guild);
      if (!player) {
        return interaction.reply({
          embeds: [errorEmbed('There is no active music player.')],
          ephemeral: true
        });
      }

      const voiceCheck = checkVoiceConditions(interaction, true);
      if (!voiceCheck.canProceed) {
        return interaction.reply({
          embeds: [errorEmbed(voiceCheck.reason)],
          ephemeral: true
        });
      }

      if (!isDJ(interaction.member)) {
        return interaction.reply({
          embeds: [errorEmbed('You must have the DJ role to use player buttons.')],
          ephemeral: true
        });
      }

      switch (customId) {
        case 'music_pause_resume':
          if (player.isPaused) {
            player.resume();
            await interaction.reply({ embeds: [successEmbed('Resumed playback.')], ephemeral: true });
          } else {
            player.pause();
            await interaction.reply({ embeds: [successEmbed('Paused playback.')], ephemeral: true });
          }
          break;

        case 'music_skip':
          if (!player.currentTrack) {
            return interaction.reply({ embeds: [errorEmbed('Nothing to skip.')], ephemeral: true });
          }
          const skipped = player.currentTrack.title;
          player.skip();
          await interaction.reply({ embeds: [successEmbed(`Skipped **${skipped}**`)], ephemeral: true });
          break;

        case 'music_stop':
          player.destroy();
          await interaction.reply({ embeds: [successEmbed('Playback stopped and queue cleared.')], ephemeral: true });
          break;

        case 'music_loop':
          const nextLoop = (player.loopMode + 1) % 3;
          player.setLoop(nextLoop);
          const loopNames = ['Disabled ❌', 'Current Track 🔂', 'Entire Queue 🔁'];
          await interaction.reply({ embeds: [successEmbed(`Loop set to: **${loopNames[nextLoop]}**`)], ephemeral: true });
          break;

        case 'music_shuffle':
          if (player.queue.size() < 2) {
            return interaction.reply({ embeds: [errorEmbed('Need at least 2 tracks in queue to shuffle.')], ephemeral: true });
          }
          player.shuffle();
          await interaction.reply({ embeds: [successEmbed(`Shuffled **${player.queue.size()}** tracks in queue.`)], ephemeral: true });
          break;

        case 'music_autoplay':
          const newAutoplay = !player.autoplay;
          player.setAutoplay(newAutoplay);
          await interaction.reply({
            embeds: [
              successEmbed(`Autoplay is now **${newAutoplay ? 'ENABLED 📻' : 'DISABLED ❌'}**.\n${newAutoplay ? 'Similar songs will play automatically when the queue ends (Rythm style).' : 'Playback will stop when the queue ends.'}`)
            ],
            ephemeral: true
          });
          break;

        case 'music_queue':
          const queueTracks = player.queue.getAll();
          if (queueTracks.length === 0 && !player.currentTrack) {
            return interaction.reply({ embeds: [errorEmbed('The music queue is currently empty.')], ephemeral: true });
          }
          const queueBatch = queueTracks.slice(0, 10);
          const queueList = queueBatch.map((track, i) => `\`${i + 1}.\` [${track.title}](${track.url})`).join('\n');
          await interaction.reply({
            embeds: [
              successEmbed(
                `**Now Playing:** [${player.currentTrack?.title || 'None'}](${player.currentTrack?.url || ''})\n\n**Upcoming (Total: ${queueTracks.length}):**\n${queueList || 'No more upcoming songs.'}`
              )
            ],
            ephemeral: true
          });
          break;

        default:
          await interaction.deferUpdate();
          break;
      }
    }
  }
};
