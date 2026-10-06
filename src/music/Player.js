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
    this.sessionVibe = null;

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

    this.audioPlayer.on('stateChange', (oldState, newState) => {
      console.log(`[AudioPlayer - Guild ${this.guild.id}] State: ${oldState.status} -> ${newState.status}`);
      if (newState.status === AudioPlayerStatus.Playing && this.isPaused) {
        this.audioPlayer.pause();
      }
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

    const detectedVibe = this.manager.detectMusicProfile(this.currentTrack.title, this.currentTrack.artist);
    if (!this.currentTrack.isAutoplay) {
      this.sessionVibe = detectedVibe;
    } else if (!this.sessionVibe) {
      this.sessionVibe = detectedVibe;
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
      this.currentResource = await this.createAudioResourceForTrack(this.currentTrack);
      if (this.currentResource.volume) {
        this.currentResource.volume.setVolume(this.volume / 100);
      }

      this.audioPlayer.play(this.currentResource);
      this.isPaused = false;

      await this.sendNowPlaying();
    } catch (err) {
      console.error('[Player] Error starting track playback:', err);
      if (this.textChannel) {
        this.textChannel.send({ embeds: [errorEmbed(`Could not play track: **${this.currentTrack ? this.currentTrack.title : 'Selected track'}** (${err.message})`)] }).catch(() => {});
      }
      this.isFetchingAutoplay = false;
      this.handleSongEnd();
    }
  }

  async createAudioResourceForTrack(track) {
    await this.manager.ensureSoundCloud();

    // 1. Direct audio file URL (.mp3, .ogg, .wav, or raw audio link)
    if (track.url && (track.url.endsWith('.mp3') || track.url.endsWith('.ogg') || track.url.endsWith('.wav') || track.isDirect)) {
      return createAudioResource(track.url);
    }

    // 2. Direct SoundCloud track
    if (track.url && (track.url.includes('soundcloud.com') || track.source === 'soundcloud')) {
      const streamInfo = await play.stream(track.url);
      return createAudioResource(streamInfo.stream, {
        inputType: streamInfo.type
      });
    }

    // 3. YouTube or generic track: stream via SoundCloud mirror
    // YouTube stream URLs are blocked with 400 / ERR_INVALID_URL on datacenter IPs,
    // so SoundCloud provides the reliable, high quality stream.
    const cleanTitle = this.manager.cleanTitle(track.title);
    const queries = [];
    if (track.artist && !['youtube', 'various artists', 'unknown', 'web audio', 'channel'].includes(track.artist.toLowerCase())) {
      queries.push(`${cleanTitle} ${track.artist}`);
    }
    queries.push(cleanTitle);
    if (track.title !== cleanTitle) {
      queries.push(track.title);
    }

    for (const q of queries) {
      try {
        const scResults = await play.search(q, { limit: 2, source: { soundcloud: 'tracks' } });
        if (scResults && scResults.length > 0) {
          const match = scResults[0];
          console.log(`[Player] Streaming audio from SoundCloud: "${match.name || match.title}" for "${track.title}"`);
          const streamInfo = await play.stream(match.url);
          return createAudioResource(streamInfo.stream, {
            inputType: streamInfo.type
          });
        }
      } catch (scErr) {
        console.warn(`[Player] SoundCloud stream search notice for "${q}":`, scErr.message);
      }
    }

    // 4. Fallback attempt directly on track.url if available
    if (track.url) {
      const streamInfo = await play.stream(track.url);
      return createAudioResource(streamInfo.stream, {
        inputType: streamInfo.type
      });
    }

    throw new Error('Unable to find a playable audio stream for this track.');
  }

  resyncStream() {
    if (!this.audioPlayer || this.isPaused) return;
    if (this.audioPlayer.state.status === AudioPlayerStatus.Playing) {
      console.log(`[Player - Guild ${this.guild.id}] Rejoin detected: performing 150ms stream resync to clear Discord WebRTC jitter backlog.`);
      this.audioPlayer.pause();
      setTimeout(() => {
        if (this.audioPlayer && this.audioPlayer.state.status === AudioPlayerStatus.Paused && !this.isPaused) {
          this.audioPlayer.unpause();
        }
      }, 150);
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
      const targetVibe = this.sessionVibe || this.manager.detectMusicProfile(referenceTrack.title, referenceTrack.artist);
      const vibeTag = targetVibe ? targetVibe.charAt(0).toUpperCase() + targetVibe.slice(1) : 'Similar';

      if (this.textChannel) {
        this.textChannel.send({
          embeds: [infoEmbed('📻 Autoplay', `Queue finished. Finding similar **${vibeTag}** songs like **${referenceTrack.title}**...`)]
        }).catch(() => {});
      }

      const nextTrack = await this.manager.getAutoplayTrack(referenceTrack, this.history, targetVibe);

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
            embeds: [successEmbed(`📻 Autoplay [${vibeTag}]: Next song **[${nextTrack.title}](${nextTrack.url})** by *${nextTrack.artist}* (similar to *${referenceTrack.title}*)`)]
          }).catch(() => {});
        }
        this.isFetchingAutoplay = false;
        await this.play(nextTrack);
      } else {
        if (this.textChannel) {
          this.textChannel.send({
            embeds: [infoEmbed('📻 Autoplay', `Could not find more **${vibeTag}** songs. Playback ended.`)]
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
    this.currentTrack = null;
    this.isFetchingAutoplay = false;
    const settings = db.getSettings(this.guild.id);

    // Keep control panel active with buttons ready
    const components = createPlayerButtons(this);
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🎵 VibeX — Control Panel (24/7 Active)')
      .setDescription(`Queue finished. The bot is staying connected in voice 24/7!\nUse the buttons below or \`/play <song>\` to play more music.\n\n📻 **Autoplay:** ${this.autoplay ? 'Enabled ✅ (Ready)' : 'Disabled ❌'}`)
      .setFooter({ text: '24/7 Continuous Mode Active • Developed by WIZARD OG' });

    if (this.nowPlayingMessage) {
      this.nowPlayingMessage.edit({ embeds: [embed], components }).catch(() => {
        if (this.textChannel) {
          this.textChannel.send({ embeds: [embed], components }).then(m => { this.nowPlayingMessage = m; }).catch(() => {});
        }
      });
    } else if (this.textChannel) {
      this.textChannel.send({ embeds: [embed], components }).then(m => { this.nowPlayingMessage = m; }).catch(() => {});
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
    this.isPaused = true;
    if (this.audioPlayer && (this.audioPlayer.state.status === AudioPlayerStatus.Playing || this.audioPlayer.state.status === AudioPlayerStatus.Buffering)) {
      this.audioPlayer.pause();
    }
    this.updateNowPlayingMessage();
    return true;
  }

  resume() {
    this.isPaused = false;
    if (this.audioPlayer && this.audioPlayer.state.status === AudioPlayerStatus.Paused) {
      this.audioPlayer.unpause();
    }
    this.updateNowPlayingMessage();
    return true;
  }

  skip() {
    this.isFetchingAutoplay = false;
    if (this.audioPlayer) {
      if (this.audioPlayer.state.status !== AudioPlayerStatus.Idle) {
        this.audioPlayer.stop(); // Triggers AudioPlayerStatus.Idle -> handleSongEnd
      } else {
        this.handleSongEnd();
      }
    } else {
      this.handleSongEnd();
    }
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
