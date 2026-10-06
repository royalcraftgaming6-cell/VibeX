const play = require('play-dl');
const Player = require('./Player');

const RECORD_LABELS = new Set([
  't-series', 'tseries', 'zee music company', 'zee music', 'sony music india',
  'sony music', 'sonymusicindiavevo', 'yrf', 'tips official', 'tips music',
  'speed records', 'white hill music', 'saregama music', 'saregama', 'geet mp3',
  'times music', 'venus', 'aditya music', 'lahari music', 'desi melodies',
  'dm - desi melodies', 'coke studio', '7clouds', 'speed punjabi', 'eros now',
  't-series apna punjab', 'worldwide records', 'drj records', 'speed records bhojpuri'
]);

const INDIAN_SCRIPTS_REGEX = /[\u0900-\u097F\u0A00-\u0A7F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0A80-\u0AFF\u0600-\u06FF]/;
const KOREAN_SCRIPTS_REGEX = /[\uAC00-\uD7AF\u1100-\u11FF]/;
const JAPANESE_SCRIPTS_REGEX = /[\u3040-\u309F\u30A0-\u30FF]/;

const INDIAN_WORDS_REGEX = /\b(k\.?k\.?|zara|jannat|emraan|hashmi|hindi|bollywood|punjabi|bhojpuri|haryanvi|tamil|telugu|malayalam|kannada|marathi|bengali|gujarati|sufi|ghazal|qawwali|bhajan|kirtan|desi|bhangra|dhol|arijit|arijit singh|neha kakkar|badshah|diljit|diljit dosanjh|karan aujla|sidhu|sidhu moose wala|b praak|jubin|jubin nautiyal|shreya|shreya ghoshal|pritam|atif|atif aslam|honey singh|yo yo honey singh|darshan|darshan raval|vishal|vishal mishra|sachin|jigar|sachin-jigar|rahman|a\.?r\.?\s*rahman|anirudh|anirudh ravichander|shilpa rao|king|divine|emiway|raftaar|ap dhillon|shubh|ammy|ammy virk|hardy|hardy sandhu|harrdy sandhu|sunidhi|sunidhi chauhan|sonu nigam|alka|alka yagnik|kumar sanu|udit|udit narayan|kishore|kishore kumar|lata|lata mangeshkar|rafi|mohammad rafi|mukesh|jagjit|jagjit singh|kk|armaan|armaan malik|amaal|amaal mallik|guru randhawa|ishq|pyaar|pyar|dil|meri|tere|tera|teri|deewana|dewana|zindagi|akhiyan|sohne|sohna|jatt|munda|kudi|gaana|geet|gana|bad newz|brahmastra|devara|aashiqui|bhool bhulaiyaa|stree|animal|dunki|jawan|pathaan|tiger|kabir singh|rockstar|tamasha|kesariya|tauba|chuttamalle|dhurandhar|lofi hindi|hindi lofi|slowed hindi|hindi slowed|himesh|himesh reshammiya|shaan|mohit chauhan|ankit tiwari|mika|mika singh|lucky ali|javed ali|ali zafar|mithoon|shekhar|atul|wajid|anand|milind|nadeem|shravan|jatin|lalit|kavita|anuradha|sadhana|talat|pankaj udhas|harshdeep|rekha bhardwaj|neeti mohan|shalmali|jonita|jonita gandhi|monali|monali thakur|antara|antara mitra|dhvani|dhvani bhanushali|tulsi|tulsi kumar|palak muchhal|kanika|kanika kapoor|seedhe maut|krsna|kr\$na|talha anjum|young stunners|sukhe|jass manak|parmish verma|jordan sandhu|nimrat khaira|sunanda sharma|t-series|tseries|zee music|sony music india|yrf|tips official|speed records|white hill|saregama|geet mp3|desire music|coke studio)\b/i;

const INDIAN_SINGERS_REGEX = /\b(k\.?k\.?|kk|arijit|arijit singh|neha kakkar|badshah|diljit|diljit dosanjh|karan aujla|sidhu|b praak|jubin|shreya|pritam|atif|honey singh|darshan|vishal|sachin|jigar|rahman|anirudh|shilpa rao|king|divine|emiway|raftaar|ap dhillon|shubh|ammy|hardy|sunidhi|sonu nigam|alka|kumar sanu|udit|kishore|lata|rafi|mukesh|jagjit|armaan|amaal|guru randhawa|himesh|shaan|mohit chauhan|mika|lucky ali|javed ali|ali zafar|mithoon|neeti mohan|jonita|monali|tulsi kumar|dhvani|palak muchhal)\b/i;

const ANIME_WORDS_REGEX = /\b(anime|jpop|j-pop|vocaloid|hatsune miku|yoasobi|kenshi yonezu|aimer|ado|radwimps|king gnu|official hige dandism|ost anime|opening|ending|gurenge|unravel|eve)\b/i;

const KPOP_WORDS_REGEX = /\b(k-pop|kpop|bts|blackpink|twice|stray kids|newjeans|aespa|ive|le sserafim|seventeen|exo|red velvet|nct|itzy|enhypen|jungkook|jung kook|jimin|taehyung|suga|j-hope|lisa|jennie|rose|jisoo|taeyeon|bigbang|ateez|got7|treasure|nmixx|illit|boynextdoor|riize|zerobaseone|v|rm|iu|txt)\b/i;

const LATIN_WORDS_REGEX = /\b(reggaeton|bachata|cumbia|salsa|bad bunny|j balvin|ozuna|maluma|anuel|karol g|rosalia|daddy yankee|feid|rauw alejandro|peso pluma|shakira|enrique iglesias|luis fonsi|bizarrap|bzrp|quevedo)\b/i;

const HIPHOP_WORDS_REGEX = /\b(kendrick lamar|drake|travis scott|eminem|kanye west|21 savage|metro boomin|future|lil baby|lil uzi|playboi carti|j\.?\s*cole|juice wrld|xxxtentacion|post malone|doja cat|cardi b|nicki minaj|gunna|asap rocky|central cee)\b/i;

function isRecordLabel(name = '') {
  if (!name) return false;
  const l = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const label of RECORD_LABELS) {
    const cl = label.replace(/[^a-z0-9]/g, '');
    if (l.includes(cl) || cl.includes(l)) return true;
  }
  return false;
}

class MusicManager {
  constructor(client) {
    this.client = client;
    this.players = new Map();
    this.soundCloudReady = false;
    this.initSources();
  }

  async initSources() {
    await this.ensureSoundCloud();
  }

  async ensureSoundCloud() {
    if (this.soundCloudReady) return true;
    try {
      const clientId = await play.getFreeClientID();
      if (clientId) {
        await play.setToken({ soundcloud: { client_id: clientId } });
        this.soundCloudReady = true;
        console.log('[MusicManager] SoundCloud streaming source ready.');
        return true;
      }
    } catch (err) {
      console.warn('[MusicManager] SoundCloud token notice:', err.message);
    }
    return false;
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

  detectMusicProfile(title = '', artist = '') {
    const text = ((title || '') + ' ' + (artist || '')).toLowerCase();

    // 1. Regional Indian scripts or words
    if (INDIAN_SCRIPTS_REGEX.test(text)) return 'indian';
    if (INDIAN_WORDS_REGEX.test(text)) return 'indian';

    // 2. Korean / K-Pop
    if (KOREAN_SCRIPTS_REGEX.test(text)) return 'kpop';
    if (KPOP_WORDS_REGEX.test(text)) return 'kpop';

    // 3. Japanese / Anime
    if (JAPANESE_SCRIPTS_REGEX.test(text)) return 'anime';
    if (ANIME_WORDS_REGEX.test(text)) return 'anime';

    // 4. Latin
    if (LATIN_WORDS_REGEX.test(text)) return 'latin';

    // 5. Hip-Hop / Rap
    if (HIPHOP_WORDS_REGEX.test(text)) return 'hiphop';

    return 'western';
  }

  cleanTitle(rawTitle) {
    if (!rawTitle) return '';
    return rawTitle
      .replace(/\(official\s*(music)?\s*(video|audio|lyrics?|visualizer|remaster|hd|4k)?\)/gi, '')
      .replace(/\[official\s*(music)?\s*(video|audio|lyrics?|visualizer|remaster|hd|4k)?\]/gi, '')
      .replace(/\((lyrics?|hd|4k|audio|remastered|remaster|visualizer)\)/gi, '')
      .replace(/\[(lyrics?|hd|4k|audio|remastered|remaster|visualizer)\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractCleanArtistAndTitle(track) {
    const rawTitle = (track?.title || '').trim();
    const rawArtist = (track?.artist || '').trim();
    const clean = this.cleanTitle(rawTitle);

    const isLabel = isRecordLabel(rawArtist);

    let detectedArtist = '';
    let songName = '';
    const pipeParts = clean.split('|').map(s => s.trim()).filter(Boolean);

    if (pipeParts.length > 1) {
      if (pipeParts[0].length <= 25 && INDIAN_SINGERS_REGEX.test(pipeParts[0]) && !/zara|ishq|pyar|dil|tere|tera|teri|deewana|zindagi|sohne|jatt/i.test(pipeParts[0])) {
        detectedArtist = pipeParts[0];
        songName = pipeParts[1].replace(/-(audio|lyric|video|visualizer).*/i, '').trim();
      } else {
        songName = pipeParts[0].split(' - ')[0].trim();
        for (let i = 1; i < pipeParts.length; i++) {
          const seg = pipeParts[i];
          if (isRecordLabel(seg) || /official|video|4k|hd|lyrics|audio|visualizer/i.test(seg) || seg.length < 2 || seg.length > 35) continue;
          if (INDIAN_SINGERS_REGEX.test(seg)) {
            detectedArtist = seg;
            break;
          }
          if (!detectedArtist) detectedArtist = seg;
        }
      }
    } else if (clean.includes(' - ')) {
      const parts = clean.split(' - ').map(s => s.trim());
      detectedArtist = parts[0];
      songName = parts.slice(1).join(' - ');
    } else {
      songName = clean;
    }

    let finalArtist = detectedArtist;
    if (!finalArtist && rawArtist && !isLabel && !['youtube', 'soundcloud', 'web audio'].includes(rawArtist.toLowerCase())) {
      finalArtist = rawArtist;
    }

    return {
      songName: songName || clean,
      artist: finalArtist || ''
    };
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
          const vibe = this.detectMusicProfile(searchQuery);
          if (vibe === 'indian' || vibe === 'kpop' || vibe === 'anime') {
            return await this.searchYouTube(searchQuery, requestedBy) ||
                   await this.searchSoundCloud(searchQuery, requestedBy);
          }
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

    // 2. Search query: Try YouTube first for fast, reliable, universal catalog results
    const ytResult = await this.searchYouTube(query, requestedBy);
    if (ytResult) return ytResult;

    // 3. Fallback to SoundCloud
    return await this.searchSoundCloud(query, requestedBy);
  }

  async searchSoundCloud(query, requestedBy) {
    await this.ensureSoundCloud();
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

  async getAutoplayTrack(previousTrack, history = [], targetVibe = null) {
    if (!previousTrack) return null;

    const vibe = targetVibe || this.detectMusicProfile(previousTrack.title, previousTrack.artist);
    const { songName, artist } = this.extractCleanArtistAndTitle(previousTrack);

    const historySet = new Set(history.map(h => (typeof h === 'string' ? h.toLowerCase() : '')));
    if (previousTrack.url) historySet.add(previousTrack.url.toLowerCase());
    if (previousTrack.title) historySet.add(this.cleanTitle(previousTrack.title).toLowerCase());

    const queries = [];
    if (vibe === 'indian') {
      // Strictly YouTube-only for Indian songs to avoid SoundCloud English pop/EDM leak
      if (artist) {
        queries.push({ q: `${artist} hindi songs audio tracks`, source: 'youtube' });
        queries.push({ q: `${artist} hits audio track`, source: 'youtube' });
      }
      if (songName && songName.length > 2) {
        queries.push({ q: `${songName} hindi song audio`, source: 'youtube' });
        queries.push({ q: `${songName} bollywood audio track`, source: 'youtube' });
      }
      queries.push({ q: 'latest bollywood hindi songs audio tracks', source: 'youtube' });
      queries.push({ q: 'top punjabi songs audio tracks', source: 'youtube' });
    } else if (vibe === 'kpop') {
      if (artist) {
        queries.push({ q: `${artist} kpop audio track`, source: 'youtube' });
        queries.push({ q: `${artist} official audio`, source: 'youtube' });
      }
      if (songName) {
        queries.push({ q: `${songName} kpop audio`, source: 'youtube' });
      }
      queries.push({ q: 'latest kpop songs audio track', source: 'youtube' });
    } else if (vibe === 'anime') {
      if (artist) {
        queries.push({ q: `${artist} anime ost audio track`, source: 'youtube' });
        queries.push({ q: `${artist} jpop audio track`, source: 'youtube' });
      }
      if (songName) {
        queries.push({ q: `${songName} anime ost audio`, source: 'youtube' });
      }
      queries.push({ q: 'popular anime ost songs audio', source: 'youtube' });
    } else if (vibe === 'latin') {
      if (artist) {
        queries.push({ q: `${artist} reggaeton cancion audio`, source: 'youtube' });
        queries.push({ q: `${artist} latin hits audio track`, source: 'youtube' });
      }
      if (songName) {
        queries.push({ q: `${songName} reggaeton audio`, source: 'youtube' });
      }
      queries.push({ q: 'top latin reggaeton songs audio tracks', source: 'youtube' });
    } else if (vibe === 'hiphop') {
      if (artist) {
        queries.push({ q: `${artist} hip hop audio track`, source: 'youtube' });
        queries.push({ q: `${artist} rap songs audio`, source: 'youtube' });
      }
      if (songName) {
        queries.push({ q: `${songName} rap audio track`, source: 'youtube' });
      }
      queries.push({ q: 'top hip hop rap tracks audio', source: 'youtube' });
    } else {
      // Western / Pop
      if (artist) {
        queries.push({ q: `${artist} songs official audio`, source: 'youtube' });
        queries.push({ q: `${artist} hit songs audio track`, source: 'youtube' });
      }
      if (songName) {
        queries.push({ q: `${songName} radio mix audio`, source: 'youtube' });
      }
      queries.push({ q: 'top pop hits official audio', source: 'youtube' });
    }

    const candidates = [];

    for (const item of queries) {
      try {
        if (item.source === 'youtube') {
          const results = await play.search(item.q, { limit: 8, source: { youtube: 'video' } });
          for (const res of results) {
            const dur = res.durationInSec || 0;
            if (dur < 45 || dur > 720) continue; // between 45s and 12 mins

            const title = res.title || '';
            const titleClean = this.cleanTitle(title).toLowerCase();
            const urlLower = (res.url || '').toLowerCase();

            // Filter out playlists, compilations, jukeboxes
            if (/jukebox|full album|mashup 1 hour|compilation|non stop|all songs/i.test(title)) continue;

            if (historySet.has(urlLower) || historySet.has(titleClean)) continue;
            if (songName && songName.length > 3 && titleClean.includes(songName.toLowerCase())) continue;

            // STRICT GENRE / VIBE VALIDATION
            const candVibe = this.detectMusicProfile(title, res.channel?.name || '');
            if (vibe === 'indian' && candVibe !== 'indian') continue;
            if (vibe === 'kpop' && candVibe !== 'kpop') continue;
            if (vibe === 'anime' && candVibe !== 'anime') continue;
            if (vibe === 'latin' && candVibe !== 'latin') continue;
            if (vibe === 'hiphop' && candVibe !== 'hiphop' && candVibe !== 'western') continue;
            if (vibe === 'western' && (candVibe === 'indian' || candVibe === 'kpop' || candVibe === 'anime')) continue;

            candidates.push({
              title: res.title,
              url: res.url,
              artist: res.channel?.name || artist || 'YouTube',
              duration: dur,
              thumbnail: res.thumbnails?.[0]?.url || null,
              source: 'youtube',
              vibe
            });
          }
        }
        if (candidates.length >= 6) break;
      } catch (err) {
        console.warn(`[MusicManager] Autoplay search failed for "${item.q}":`, err.message);
      }
    }

    if (candidates.length === 0) return null;
    const pool = candidates.slice(0, Math.min(4, candidates.length));
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    return {
      ...chosen,
      requestedBy: {
        username: 'Autoplay (Rythm)',
        tag: 'Autoplay',
        displayAvatarURL: () => 'https://cdn.discordapp.com/emojis/852899478148841482.webp'
      },
      isAutoplay: true,
      vibe,
      basedOn: previousTrack.title
    };
  }
}

module.exports = MusicManager;
