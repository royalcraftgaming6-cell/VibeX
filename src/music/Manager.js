const play = require('play-dl');
const Player = require('./Player');

class MusicManager {
  constructor(client) {
    this.client = client;
    this.players = new Map();
    this.soundCloudReady = false;
    this.initSources();
  }

  async initSources() {
    try {
      const clientId = await play.getFreeClientID();
      if (clientId) {
        await play.setToken({ soundcloud: { client_id: clientId } });
        this.soundCloudReady = true;
        console.log('[MusicManager] SoundCloud streaming source ready.');
      }
    } catch (err) {
      console.warn('[MusicManager] SoundCloud token notice:', err.message);
    }
  }

  getPlayer(guild, create = false) {
    if (!guild) return null;
    let player = this.players.get(guild.id);
    if (!player && create) {
      player = new Player(guild, this);
      this.players.set(guild.id, player);
    }
    return player || null;
  }

  delete(guildId) {
    this.players.delete(guildId);
  }

  async resolveTrack(query, requestedBy) {
    query = query.trim();

    // 1. Direct audio file URL (mp3, wav, ogg, etc.)
    if (query.startsWith('http://') || query.startsWith('https://')) {
      if (query.match(/\.(mp3|wav|ogg|aac|m4a)(\?.*)?$/i)) {
        return {
          title: decodeURIComponent(query.split('/').pop().split('?')[0]) || 'Direct Audio Stream',
          url: query,
          artist: 'Web Audio',
          duration: 0,
          thumbnail: null,
          requestedBy,
          isDirect: true
        };
      }

      // URL validation with play-dl
      try {
        const validation = await play.validate(query);

        if (validation && (validation.startsWith('so_track') || validation === 'so_track')) {
          const soData = await play.soundcloud(query);
          return {
            title: soData.name,
            url: soData.url,
            artist: soData.user?.name || 'SoundCloud',
            duration: Math.floor((soData.durationInMs || 0) / 1000),
            thumbnail: soData.thumbnail,
            requestedBy,
            source: 'soundcloud'
          };
        }

        if (validation && (validation.startsWith('sp_track') || validation === 'sp_track')) {
          const spData = await play.spotify(query);
          const searchQuery = `${spData.name} ${spData.artists?.[0]?.name || ''}`;
          // Resolve stream via SoundCloud or search
          return await this.searchSoundCloud(searchQuery, requestedBy) ||
                 await this.searchYouTube(searchQuery, requestedBy);
        }

        if (validation && (validation.startsWith('yt_video') || validation === 'yt_video')) {
          try {
            const info = await play.video_basic_info(query);
            return {
              title: info.video_details.title,
              url: info.video_details.url,
              artist: info.video_details.channel?.name || 'YouTube',
              duration: info.video_details.durationInSec,
              thumbnail: info.video_details.thumbnails?.[0]?.url,
              requestedBy,
              source: 'youtube'
            };
          } catch (ytErr) {
            console.warn('[MusicManager] YouTube direct info failed (likely rate-limited). Searching SoundCloud fallback...');
          }
        }
      } catch (validationErr) {
        console.warn('[MusicManager] URL validation fallback:', validationErr.message);
      }
    }

    // 2. Search query: Try SoundCloud first for reliable cloud/Render streaming
    const scResult = await this.searchSoundCloud(query, requestedBy);
    if (scResult) return scResult;

    // 3. Fallback: Try YouTube search
    return await this.searchYouTube(query, requestedBy);
  }

  async searchSoundCloud(query, requestedBy) {
    try {
      const results = await play.search(query, {
        limit: 1,
        source: { soundcloud: 'tracks' }
      });

      if (results && results.length > 0) {
        const item = results[0];
        return {
          title: item.name || query,
          url: item.url,
          artist: item.user?.name || 'SoundCloud Artist',
          duration: Math.floor((item.durationInMs || 0) / 1000),
          thumbnail: item.thumbnail || null,
          requestedBy,
          source: 'soundcloud'
        };
      }
    } catch (err) {
      console.warn('[MusicManager] SoundCloud search attempt failed:', err.message);
    }
    return null;
  }

  async searchYouTube(query, requestedBy) {
    try {
      const results = await play.search(query, {
        limit: 1,
        source: { youtube: 'video' }
      });

      if (results && results.length > 0) {
        const item = results[0];
        return {
          title: item.title,
          url: item.url,
          artist: item.channel?.name || 'YouTube',
          duration: item.durationInSec,
          thumbnail: item.thumbnails?.[0]?.url || null,
          requestedBy,
          source: 'youtube'
        };
      }
    } catch (err) {
      console.warn('[MusicManager] YouTube search attempt failed:', err.message);
    }
    return null;
  }
}

module.exports = MusicManager;
