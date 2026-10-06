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

  if (!member || !member.voice.channel) {
    return { canProceed: false, reason: 'You must be in a voice channel to use this command!' };
  }

  const botVoiceChannel = guild.members.me?.voice.channel;
  if (checkBotSameVoice && botVoiceChannel && member.voice.channel.id !== botVoiceChannel.id) {
    return { canProceed: false, reason: `You must be in the same voice channel as the bot (${botVoiceChannel.name})!` };
  }

  return { canProceed: true };
}

module.exports = {
  isDJ,
  checkVoiceConditions
};
