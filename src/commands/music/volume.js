const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'volume',
  description: 'Adjusts the music playback volume (1-100%).',
  aliases: ['vol', 'v'],
  voiceRequired: true,
  sameVoiceRequired: true,
  djOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Adjusts the music playback volume (1-100%).')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Volume level from 1 to 100')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(false)
    ),
  async execute(ctx) {
    const player = ctx.manager.getPlayer(ctx.guild);
    if (!player) {
      return ctx.sendError('There is no active music session.');
    }

    let amount;
    if (ctx.isSlash) {
      amount = ctx.interaction.options.getInteger('amount');
    } else if (ctx.args[0] && !isNaN(ctx.args[0])) {
      amount = parseInt(ctx.args[0], 10);
    }

    if (amount === undefined || amount === null) {
      return ctx.reply({ embeds: [successEmbed(`Current volume is **${player.volume}%**`)] });
    }

    if (amount < 1 || amount > 100) {
      return ctx.sendError('Volume must be a number between 1 and 100.');
    }

    player.setVolume(amount);
    return ctx.reply({ embeds: [successEmbed(`Volume set to **${amount}%**`)] });
  }
};
