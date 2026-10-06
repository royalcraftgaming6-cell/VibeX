const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const os = require('os');

module.exports = {
  name: 'stats',
  description: 'Displays bot system statistics, memory usage, and uptime.',
  aliases: ['botinfo', 'info'],
  slashData: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Displays bot system statistics, memory usage, and uptime.'),
  async execute(ctx) {
    const uptimeSec = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSec / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);
    const secs = uptimeSec % 60;
    const uptimeStr = `${hours}h ${mins}m ${secs}s`;

    const memoryMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const guildsCount = ctx.client.guilds.cache.size;
    const usersCount = ctx.client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('📊 VibeX — Statistics')
      .setDescription('🎵 **VibeX** — Discord Music Bot • Developed by **WIZARD OG**')
      .addFields(
        { name: '👑 Developer', value: '`WIZARD OG`', inline: true },
        { name: '🌐 Servers', value: `${guildsCount}`, inline: true },
        { name: '👥 Total Users', value: `${usersCount}`, inline: true },
        { name: '⏱️ Uptime', value: uptimeStr, inline: true },
        { name: '💾 Memory Usage', value: `${memoryMB} MB`, inline: true },
        { name: '🟢 Node.js', value: process.version, inline: true }
      )
      .setFooter({ text: 'VibeX Music Bot • Developed by WIZARD OG' });

    await ctx.reply({ embeds: [embed] });
  }
};
