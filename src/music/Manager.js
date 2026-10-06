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

  cleanTitle(rawTitle) {
    if (!rawTitle) return '';
    return rawTitle
      .replace(/\(official\s*(music)?\s*(video|audio|lyrics?|visualizer|remaster|hd|4k)?\)/gi, '')
      .replace(/\[official\s*(music)?\s*(video|audio|lyrics?|visualizer|remaster|hd|4k)?\]/gi, '')
      .replace(/\((lyrics?|hd|4k|audio|remastered|remaster|visualizer)\)/gi, '')
      .replace(/\[(lyrics?|hd|4k|audio|remastered|remaster|visualizer)\]/gi, '')
      .replace(/\|.*$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async getAutoplayTrack(previousTrack, history = []) {
    if (!previousTrack) return null;

    const cleaned = this.cleanTitle(previousTrack.title || '');
    let artist = previousTrack.artist || '';
    if (['youtube', 'soundcloud', 'web audio'].includes(artist.toLowerCase())) {
      artist = '';
    }

    let songName = cleaned;
    if (cleaned.includes(' - ')) {
      const parts = cleaned.split(' - ');
      if (!artist) artist = parts[0].trim();
      songName = parts.slice(1).join(' - ').trim();
    } else if (cleaned.includes(' : ')) {
      const parts = cleaned.split(' : ');
      if (!artist) artist = parts[0].trim();
      songName = parts.slice(1).join(' : ').trim();
    }

    const historySet = new Set(history.map(h => (typeof h === 'string' ? h.toLowerCase() : '')));
    if (previousTrack.url) historySet.add(previousTrack.url.toLowerCase());
    if (previousTrack.title) historySet.add(this.cleanTitle(previousTrack.title).toLowerCase());

    const queries = [];
    if (artist && songName && artist.toLowerCase() !== songName.toLowerCase()) {
      queries.push({ q: `${artist} top songs audio`, source: 'youtube' });
      queries.push({ q: `${artist} audio`, source: 'youtube' });
      queries.push({ q: artist, source: 'soundcloud' });
      queries.push({ q: `${songName} radio mix`, source: 'youtube' });
    } else if (artist) {
      queries.push({ q: `${artist} songs`, source: 'youtube' });
      queries.push({ q: artist, source: 'soundcloud' });
    } else {
      queries.push({ q: `${cleaned} music`, source: 'youtube' });
      queries.push({ q: cleaned, source: 'soundcloud' });
    }

    const candidates = [];

    for (const item of queries) {
      try {
        if (item.source === 'youtube') {
          const results = await play.search(item.q, { limit: 8, source: { youtube: 'video' } });
          for (const res of results) {
            const dur = res.durationInSec || 0;
            if (dur < 45 || dur > 720) continue;
            const urlLower = res.url.toLowerCase();
            const titleClean = this.cleanTitle(res.title || '').toLowerCase();
            if (historySet.has(urlLower) || historySet.has(titleClean)) continue;
            if (songName.length > 3 && titleClean.includes(songName.toLowerCase())) continue;

            candidates.push({
              title: res.title,
              url: res.url,
              artist: res.channel?.name || artist || 'YouTube',
              duration: dur,
              thumbnail: res.thumbnails?.[0]?.url || null,
              source: 'youtube'
            });
          }
        } else if (item.source === 'soundcloud') {
          const results = await play.search(item.q, { limit: 8, source: { soundcloud: 'tracks' } });
          for (const res of results) {
            const dur = Math.floor((res.durationInMs || 0) / 1000);
            if (dur < 45 || dur > 720) continue;
            const urlLower = (res.url || '').toLowerCase();
            const titleClean = this.cleanTitle(res.name || '').toLowerCase();
            if (historySet.has(urlLower) || historySet.has(titleClean)) continue;
            if (songName.length > 3 && titleClean.includes(songName.toLowerCase())) continue;

            candidates.push({
              title: res.name,
              url: res.url,
              artist: res.user?.name || artist || 'SoundCloud',
              duration: dur,
              thumbnail: res.thumbnail || null,
              source: 'soundcloud'
            });
          }
        }
        if (candidates.length >= 6) break;
      } catch (err) {
        console.warn(`[MusicManager] Autoplay search failed for "${item.q}":`, err.message);
      }
    }

    if (candidates.length === 0) return null;
    const pool = candidates.slice(0, Math.min(3, candidates.length));
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    return {
      ...chosen,
      requestedBy: {
        username: 'Autoplay (Rythm)',
        tag: 'Autoplay',
        displayAvatarURL: () => 'https://cdn.discordapp.com/emojis/852899478148841482.webp'
      },
      isAutoplay: true,
      basedOn: previousTrack.title
    };
  }
}

module.exports = MusicManager;
