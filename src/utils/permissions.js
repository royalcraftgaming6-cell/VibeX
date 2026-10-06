const { PermissionsBitField } = require('discord.js');
const db = require('../database');

function isDJ(member) {
  if (!member || !member.guild) return false;

  // Administrators always have DJ permissions
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  if (member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return true;

  const settings = db.getSettings(member.guild.id);
  if (settings.dj_role) {
    return member.roles.cache.has(settings.dj_role);
  }

  // If no DJ role is set, allow users with Manage Messages or voice channel alone
  return true;
}

function checkVoiceConditions(interactionOrMessage, checkBotSameVoice = true) {
  const member = interactionOrMessage.member;
  const guild = interactionOrMessage.guild;
  const botVoiceChannel = guild.members.me?.voice?.channel;

  // If the bot is already connected to a voice channel, allow users in text channels to manage it!
  if (botVoiceChannel) {
    if (checkBotSameVoice && member?.voice?.channel && member.voice.channel.id !== botVoiceChannel.id) {
      return { canProceed: false, reason: `You are in a different voice channel! The bot is playing in **${botVoiceChannel.name}**.` };
    }
    return { canProceed: true };
  }

  // If the bot is not yet in a voice channel, the user must join one
  if (!member || !member.voice?.channel) {
    return { canProceed: false, reason: 'You must be in a voice channel to start playing music!' };
  }

  return { canProceed: true };
}

module.exports = {
  isDJ,
  checkVoiceConditions
};
