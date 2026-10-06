const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior
} = require('@discordjs/voice');
const play = require('play-dl');
const Queue = require('./Queue');
const db = require('../database');
const { createNowPlayingEmbed, createPlayerButtons, errorEmbed } = require('../utils/embed');

class Player {
  constructor(guild, manager) {
    this.guild = guild;
    this.manager = manager;
    this.queue = new Queue();

    this.connection = null;
    this.audioPlayer = null;
    this.currentResource = null;
    this.currentTrack = null;

    this.textChannel = null;
    this.nowPlayingMessage = null;

    // Settings
    const settings = db.getSettings(guild.id);
    this.volume = settings.default_volume || 80;
    this.loopMode = 0; // 0 = off, 1 = track, 2 = queue
    this.isPaused = false;
    this.disconnectTimeout = null;

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

  handleSongEnd() {
    const previous = this.currentTrack;

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
    } else {
      this.currentTrack = null;
      this.handleQueueEmpty();
    }
  }

  handleQueueEmpty() {
    if (this.nowPlayingMessage) {
      this.nowPlayingMessage.edit({ components: [] }).catch(() => {});
      this.nowPlayingMessage = null;
    }

    const settings = db.getSettings(this.guild.id);
    if (!settings.twenty_four_seven) {
      // Inactivity timeout: disconnect after 2 minutes of idle
      this.startDisconnectTimer(120000);
    }
  }

  startDisconnectTimer(ms) {
    this.clearDisconnectTimer();
    this.disconnectTimeout = setTimeout(() => {
      if (this.textChannel) {
        this.textChannel.send({ embeds: [errorEmbed('Left voice channel due to inactivity.')] }).catch(() => {});
      }
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

  shuffle() {
    this.queue.shuffle();
  }

  destroy() {
    this.clearDisconnectTimer();
    this.queue.clear();
    this.currentTrack = null;

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
