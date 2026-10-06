const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');

module.exports = {
  name: 'settings',
  description: 'Shows current music and server settings for this server.',
  aliases: ['config', 'conf'],
  adminOnly: false,
  slashData: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Shows current music and server settings for this server.'),
  async execute(ctx) {
    const s = db.getSettings(ctx.guild.id);
    const djRoleMention = s.dj_role ? `<@&${s.dj_role}>` : '`None (Everyone is DJ)`';
    const is247 = s.twenty_four_seven ? '`Enabled ✅`' : '`Disabled ❌`';
    const isAutoplay = s.autoplay ? '`Enabled ✅`' : '`Disabled ❌`';

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`⚙️ Server Settings — ${ctx.guild.name}`)
      .addFields(
        { name: 'Prefix', value: `\`${s.prefix}\``, inline: true },
        { name: 'DJ Role', value: djRoleMention, inline: true },
        { name: 'Default Volume', value: `\`${s.default_volume}%\``, inline: true },
        { name: '24/7 Voice Mode', value: is247, inline: true },
        { name: 'Autoplay (Rythm)', value: isAutoplay, inline: true }
      )
      .setFooter({ text: 'DJs/Admins can configure settings using /prefix, /dj, /247, and /autoplay' });

    return ctx.reply({ embeds: [embed] });
  }
};
