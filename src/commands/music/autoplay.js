const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'autoplay',
  description: 'Toggles or sets autoplay mode like Rythm bot to play similar songs when the queue ends.',
  aliases: ['ap', 'auto-play', 'autoplays'],
  voiceRequired: true,
  sameVoiceRequired: true,
  djOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Toggles or sets autoplay mode like Rythm bot.')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Turn autoplay on or off')
        .setRequired(false)
    ),
  async execute(ctx) {
    const player = ctx.manager.getPlayer(ctx.guild, true);
    if (!player) {
      return ctx.sendError('Could not initialize the music player for this server.');
    }

    let newState;
    if (ctx.isSlash) {
      const explicit = ctx.interaction.options.getBoolean('enabled');
      newState = explicit !== null ? explicit : !player.autoplay;
    } else {
      if (ctx.args[0]) {
        const arg = ctx.args[0].toLowerCase();
        if (['on', 'enable', 'enabled', 'true', '1'].includes(arg)) {
          newState = true;
        } else if (['off', 'disable', 'disabled', 'false', '0'].includes(arg)) {
          newState = false;
        } else {
          newState = !player.autoplay;
        }
      } else {
        newState = !player.autoplay;
      }
    }

    player.setAutoplay(newState);

    return ctx.reply({
      embeds: [
        successEmbed(
          `Autoplay is now **${newState ? 'ENABLED 📻' : 'DISABLED ❌'}**.\n${
            newState
              ? 'When your queue finishes, VibeX will automatically find and play similar songs (Rythm style)!'
              : 'Playback will stop when the current queue ends.'
          }`
        )
      ]
    });
  }
};
