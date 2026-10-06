const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embed');

module.exports = {
  name: 'ping',
  description: 'Shows the bot latency and Discord API websocket ping.',
  aliases: ['latency', 'p'],
  slashData: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Shows the bot latency and Discord API websocket ping.'),
  async execute(ctx) {
    const wsPing = ctx.client.ws.ping;
    const embed = infoEmbed('🏓 Pong!', `📡 **Websocket Latency:** \`${wsPing}ms\``);
    await ctx.reply({ embeds: [embed] });
  }
};
