const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior
} = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const play = require('play-dl');
const Queue = require('./Queue');
const db = require('../database');
const config = require('../config');
const { createNowPlayingEmbed, createPlayerButtons, errorEmbed, successEmbed, infoEmbed } = require('../utils/embed');

class Player {
  constructor(guild, manager) {
    this.guild = guild;
    this.manager = manager;
    this.queue = new Queue();

    this.connection = null;
    this.voiceChannel = null;
    this.audioPlayer = null;
    this.currentResource = null;
    this.currentTrack = null;
    this.previousTrack = null;
    this.history = [];

    this.textChannel = null;
    this.nowPlayingMessage = null;

    // Settings
    const settings = db.getSettings(guild.id);
    this.volume = settings.default_volume || 80;
    this.loopMode = 0; // 0 = off, 1 = track, 2 = queue
    this.autoplay = Boolean(settings.autoplay);
    this.isPaused = false;
    this.disconnectTimeout = null;
    this.isFetchingAutoplay = false;

    this.initAudioPlayer();
  }

  initAudioPlayer() {
    this.audioPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play
      }
    });

    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      this.handleSongEnd();
    });

    this.audioPlayer.on('error', (error) => {
      console.error(`[AudioPlayer Error - Guild ${this.guild.id}]:`, error.message);
      if (this.textChannel) {
        this.textChannel.send({ embeds: [errorEmbed(`Playback error: ${error.message}`)] }).catch(() => {});
      }
      this.handleSongEnd();
    });
  }

  async connect(voiceChannel, textChannel = null) {
    if (textChannel) this.textChannel = textChannel;
    if (voiceChannel) this.voiceChannel = voiceChannel;

    this.clearDisconnectTimer();

    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: this.guild.id,
      adapterCreator: this.guild.voiceAdapterCreator
    });

    this.connection.subscribe(this.audioPlayer);

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5000)
        ]);
        // Reconnected
      } catch {
        const settings = db.getSettings(this.guild.id);
        if (settings.twenty_four_seven && this.voiceChannel) {
          console.log(`[Player] 24/7 Mode: Reconnecting to voice channel in ${this.guild.name}...`);
          try {
            await this.connect(this.voiceChannel, this.textChannel);
            return;
          } catch (reconnectErr) {
            console.error('[Player] 24/7 Reconnect attempt error:', reconnectErr.message);
          }
        }
        // Disconnect confirmed
        this.destroy();
      }
    });

    return this.connection;
  }

  get playbackDuration() {
    return this.currentResource ? this.currentResource.playbackDuration : 0;
  }

  async play(track) {
    this.clearDisconnectTimer();

    if (track) {
      this.currentTrack = track;
    }

    if (!this.currentTrack) {
      return this.handleQueueEmpty();
    }

    if (this.currentTrack.url) {
      this.history.push(this.currentTrack.url.toLowerCase());
    }
    if (this.currentTrack.title) {
      this.history.push(this.currentTrack.title.toLowerCase());
    }
    if (this.history.length > 200) {
      this.history.splice(0, 50);
    }

    try {
      let streamInfo;
      if (this.currentTrack.url && (this.currentTrack.url.endsWith('.mp3') || this.currentTrack.url.endsWith('.ogg') || this.currentTrack.isDirect)) {
        this.currentResource = createAudioResource(this.currentTrack.url, {
          inlineVolume: true
        });
      } else {
        try {
          streamInfo = await play.stream(this.currentTrack.url);
          this.currentResource = createAudioResource(streamInfo.stream, {
            inputType: streamInfo.type,
            inlineVolume: true
          });
        } catch (streamErr) {
          console.warn('[Player] Initial stream error:', streamErr.message);
          // If stream failed (e.g. YouTube 429), try finding alternative on SoundCloud
          const scFallback = await this.manager.searchSoundCloud(this.currentTrack.title, this.currentTrack.requestedBy);
          if (scFallback) {
            console.log(`[Player] Fallback found on SoundCloud: ${scFallback.title}`);
            this.currentTrack = scFallback;
            streamInfo = await play.stream(scFallback.url);
            this.currentResource = createAudioResource(streamInfo.stream, {
              inputType: streamInfo.type,
              inlineVolume: true
            });
          } else {
            throw streamErr;
          }
        }
      }

      this.currentResource.volume.setVolume(this.volume / 100);
      this.audioPlayer.play(this.currentResource);
      this.isPaused = false;

      await this.sendNowPlaying();
    } catch (err) {
      console.error('Error starting track playback:', err);
      if (this.textChannel) {
        this.textChannel.send({ embeds: [errorEmbed(`Could not play track: **${this.currentTrack.title}** (${err.message})`)] }).catch(() => {});
      }
      this.handleSongEnd();
    }
  }

  async sendNowPlaying() {
    if (!this.textChannel || !this.currentTrack) return;

    try {
      const embed = createNowPlayingEmbed(this.currentTrack, this);
      const components = createPlayerButtons(this);

      // Clean up previous now playing message if exists
      if (this.nowPlayingMessage) {
        this.nowPlayingMessage.delete().catch(() => {});
      }

      this.nowPlayingMessage = await this.textChannel.send({
        embeds: [embed],
        components
      });
    } catch (err) {
      console.error('Failed to send Now Playing embed:', err);
    }
  }

  async updateNowPlayingMessage() {
    if (!this.nowPlayingMessage || !this.currentTrack) return;
    try {
      const embed = createNowPlayingEmbed(this.currentTrack, this);
      const components = createPlayerButtons(this);
      await this.nowPlayingMessage.edit({ embeds: [embed], components });
    } catch {
      // Message may have been deleted by user
    }
  }

  async handleSongEnd() {
    const previous = this.currentTrack;
    if (previous) {
      this.previousTrack = previous;
    }

    // Loop Single Track
    if (this.loopMode === 1 && previous) {
      return this.play(previous);
    }

    // Loop Entire Queue
    if (this.loopMode === 2 && previous) {
      this.queue.add(previous);
    }

    const nextTrack = this.queue.next();
    if (nextTrack) {
      this.play(nextTrack);
    } else if (this.autoplay && (previous || this.previousTrack)) {
      this.currentTrack = null;
      await this.handleAutoplay(previous || this.previousTrack);
    } else {
      this.currentTrack = null;
      this.handleQueueEmpty();
    }
  }

  async handleAutoplay(referenceTrack) {
    if (!referenceTrack || this.isFetchingAutoplay) return;
    this.isFetchingAutoplay = true;

    try {
      if (this.nowPlayingMessage) {
        this.nowPlayingMessage.edit({ components: [] }).catch(() => {});
        this.nowPlayingMessage = null;
      }

      if (this.textChannel) {
        this.textChannel.send({
          embeds: [infoEmbed('📻 Autoplay', `Queue finished. Finding similar songs like **${referenceTrack.title}**...`)]
        }).catch(() => {});
      }

      const nextTrack = await this.manager.getAutoplayTrack(referenceTrack, this.history);

      if (!this.connection || !this.audioPlayer) {
        this.isFetchingAutoplay = false;
        return;
      }

      // If tracks were added to the queue while searching
      if (!this.queue.isEmpty()) {
        this.isFetchingAutoplay = false;
        return this.play(this.queue.next());
      }

      if (nextTrack) {
        if (this.textChannel) {
          this.textChannel.send({
            embeds: [successEmbed(`📻 Autoplay: Next song **[${nextTrack.title}](${nextTrack.url})** by *${nextTrack.artist}* (similar to *${referenceTrack.title}*)`)]
          }).catch(() => {});
        }
        this.isFetchingAutoplay = false;
        await this.play(nextTrack);
      } else {
        if (this.textChannel) {
          this.textChannel.send({
            embeds: [infoEmbed('📻 Autoplay', 'Could not find more similar songs. Playback ended.')]
          }).catch(() => {});
        }
        this.isFetchingAutoplay = false;
        this.handleQueueEmpty();
      }
    } catch (err) {
      console.error('[Player] Error during autoplay:', err);
      this.isFetchingAutoplay = false;
      this.handleQueueEmpty();
    }
  }

  handleQueueEmpty() {
    const settings = db.getSettings(this.guild.id);

    // Keep control panel active with buttons ready
    if (this.nowPlayingMessage) {
      const components = createPlayerButtons(this);
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎵 VibeX — Control Panel (24/7 Active)')
        .setDescription(`Queue finished. The bot is staying connected in voice 24/7!\nUse the buttons below or \`/play <song>\` to play more music.\n\n📻 **Autoplay:** ${this.autoplay ? 'Enabled ✅ (Ready)' : 'Disabled ❌'}`)
        .setFooter({ text: '24/7 Continuous Mode Active • Developed by WIZARD OG' });

      this.nowPlayingMessage.edit({ embeds: [embed], components }).catch(() => {});
    }

    if (!settings.twenty_four_seven) {
      // Inactivity timeout: disconnect after 2 minutes only if 24/7 is explicitly disabled
      this.startDisconnectTimer(120000);
    }
  }

  startDisconnectTimer(ms) {
    this.clearDisconnectTimer();
    const settings = db.getSettings(this.guild.id);
    if (settings.twenty_four_seven) return;

    this.disconnectTimeout = setTimeout(() => {
      const current = db.getSettings(this.guild.id);
      if (current.twenty_four_seven) return;
      this.destroy();
    }, ms);
  }

  clearDisconnectTimer() {
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }
  }

  pause() {
    if (this.audioPlayer.state.status === AudioPlayerStatus.Playing) {
      this.audioPlayer.pause();
      this.isPaused = true;
      this.updateNowPlayingMessage();
      return true;
    }
    return false;
  }

  resume() {
    if (this.isPaused) {
      this.audioPlayer.unpause();
      this.isPaused = false;
      this.updateNowPlayingMessage();
      return true;
    }
    return false;
  }

  skip() {
    this.audioPlayer.stop(); // Triggers AudioPlayerStatus.Idle -> handleSongEnd
    return true;
  }

  stop() {
    this.queue.clear();
    this.currentTrack = null;
    this.loopMode = 0;
    this.isFetchingAutoplay = false;
    this.audioPlayer.stop(true);
    this.handleQueueEmpty();
    return true;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(100, vol));
    if (this.currentResource && this.currentResource.volume) {
      this.currentResource.volume.setVolume(this.volume / 100);
    }
    this.updateNowPlayingMessage();
    return this.volume;
  }

  setLoop(mode) {
    // 0: Off, 1: Track, 2: Queue
    this.loopMode = mode;
    this.updateNowPlayingMessage();
    return this.loopMode;
  }

  setAutoplay(mode) {
    this.autoplay = Boolean(mode);
    db.setAutoplay(this.guild.id, this.autoplay);
    this.updateNowPlayingMessage();

    // If turned on while idle and we have a previous track or queue
    if (this.autoplay && !this.currentTrack && this.connection && (this.previousTrack || !this.queue.isEmpty())) {
      if (!this.queue.isEmpty()) {
        this.play(this.queue.next());
      } else if (this.previousTrack) {
        this.handleAutoplay(this.previousTrack);
      }
    }

    return this.autoplay;
  }

  shuffle() {
    this.queue.shuffle();
  }

  destroy() {
    this.clearDisconnectTimer();
    this.queue.clear();
    this.currentTrack = null;
    this.isFetchingAutoplay = false;

    if (this.nowPlayingMessage) {
      this.nowPlayingMessage.delete().catch(() => {});
      this.nowPlayingMessage = null;
    }

    if (this.audioPlayer) {
      this.audioPlayer.stop(true);
    }

    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }

    this.manager.delete(this.guild.id);
  }
}

module.exports = Player;
