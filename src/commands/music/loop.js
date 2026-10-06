const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'loop',
  description: 'Toggles or sets the loop mode (Off, Track, Queue).',
  aliases: ['repeat', 'l'],
  voiceRequired: true,
  sameVoiceRequired: true,
  djOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Toggles or sets the loop mode (Off, Track, Queue).')
    .addStringOption(option =>
      option.setName('mode')
        .setDescription('Loop mode to set')
        .addChoices(
          { name: 'Off', value: 'off' },
          { name: 'Track', value: 'track' },
          { name: 'Queue', value: 'queue' }
        )
    ),
  async execute(ctx) {
    const player = ctx.manager.getPlayer(ctx.guild);
    if (!player || !player.currentTrack) {
      return ctx.sendError('There is nothing currently playing to loop.');
    }

    let modeArg;
    if (ctx.isSlash) {
      modeArg = ctx.interaction.options.getString('mode');
    } else if (ctx.args[0]) {
      modeArg = ctx.args[0].toLowerCase();
    }

    let newMode;
    if (modeArg === 'off' || modeArg === '0') {
      newMode = 0;
    } else if (modeArg === 'track' || modeArg === 'song' || modeArg === '1') {
      newMode = 1;
    } else if (modeArg === 'queue' || modeArg === 'all' || modeArg === '2') {
      newMode = 2;
    } else {
      // Cycle: 0 -> 1 -> 2 -> 0
      newMode = (player.loopMode + 1) % 3;
    }

    player.setLoop(newMode);
    const modeLabels = ['Disabled ❌', 'Current Track 🔂', 'Entire Queue 🔁'];
    return ctx.reply({ embeds: [successEmbed(`Loop mode set to: **${modeLabels[newMode]}**`)] });
  }
};
