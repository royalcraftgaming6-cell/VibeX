const play = require('play-dl');
const Player = require('./Player');

class MusicManager {
  constructor(client) {
    this.client = client;
    this.players = new Map();
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

    // Check if query is direct audio stream URL
    if (query.startsWith('http://') || query.startsWith('https://')) {
      if (query.match(/\.(mp3|wav|ogg|aac|m4a)(\?.*)?$/i)) {
        return {
          title: query.split('/').pop().split('?')[0] || 'Direct Audio Stream',
          url: query,
          artist: 'Web Stream',
          duration: 0,
          thumbnail: null,
          requestedBy,
          isDirect: true
        };
      }

      // Check URL validation with play-dl
      const validation = await play.validate(query);
      if (validation) {
        if (validation.startsWith('yt_video') || validation === 'yt_video') {
          const info = await play.video_basic_info(query);
          return {
            title: info.video_details.title,
            url: info.video_details.url,
            artist: info.video_details.channel?.name || 'YouTube',
            duration: info.video_details.durationInSec,
            thumbnail: info.video_details.thumbnails[0]?.url,
            requestedBy
          };
        } else if (validation.startsWith('sp_track')) {
          const spData = await play.spotify(query);
          // Spotify tracks need to be searched on YouTube or Soundcloud for streaming
          const searchResults = await play.search(`${spData.name} ${spData.artists[0]?.name}`, {
            limit: 1
          });
          if (searchResults.length > 0) {
            return {
              title: spData.name,
              url: searchResults[0].url,
              artist: spData.artists.map(a => a.name).join(', '),
              duration: spData.durationInSec,
              thumbnail: spData.thumbnail?.url,
              requestedBy
            };
          }
        } else if (validation.startsWith('so_track')) {
          const soData = await play.soundcloud(query);
          return {
            title: soData.name,
            url: soData.url,
            artist: soData.user?.name || 'SoundCloud',
            duration: Math.floor(soData.durationInMs / 1000),
            thumbnail: soData.thumbnail,
            requestedBy
          };
        }
      }
    }

    // Otherwise, perform search
    const results = await play.search(query, {
      limit: 1,
      source: { youtube: 'video' }
    });

    if (!results || results.length === 0) {
      return null;
    }

    const item = results[0];
    return {
      title: item.title,
      url: item.url,
      artist: item.channel?.name || 'Unknown',
      duration: item.durationInSec,
      thumbnail: item.thumbnails[0]?.url,
      requestedBy
    };
  }
}

module.exports = MusicManager;
