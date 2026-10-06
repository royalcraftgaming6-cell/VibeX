const { errorEmbed, successEmbed } = require('./embed');

class CommandContext {
  constructor(options) {
    this.client = options.client;
    this.guild = options.guild;
    this.member = options.member;
    this.user = options.user;
    this.channel = options.channel;
    this.interaction = options.interaction || null;
    this.message = options.message || null;
    this.args = options.args || [];
    this.manager = options.client.musicManager;
    this.isSlash = Boolean(this.interaction);
  }

  async defer() {
    if (this.isSlash) {
      if (!this.interaction.deferred && !this.interaction.replied) {
        return this.interaction.deferReply();
      }
    } else {
      if (this.channel.sendTyping) {
        return this.channel.sendTyping().catch(() => {});
      }
    }
  }

  async reply(content) {
    if (this.isSlash) {
      try {
        if (this.interaction.deferred || this.interaction.replied) {
          return await this.interaction.editReply(content);
        }
        return await this.interaction.reply(content);
      } catch (err) {
        try {
          return await this.interaction.followUp(content);
        } catch (fErr) {
          console.error('[CommandContext] Failed to send interaction reply:', fErr.message);
        }
      }
    } else {
      return this.message.reply(content).catch(() => {});
    }
  }

  async sendError(text) {
    return this.reply({ embeds: [errorEmbed(text)] });
  }

  async sendSuccess(text) {
    return this.reply({ embeds: [successEmbed(text)] });
  }
}

module.exports = CommandContext;
