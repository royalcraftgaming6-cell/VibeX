const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFilePath = path.join(dataDir, 'wizard_music.json');

// In-memory cache of guild settings
let settingsStore = {};

// Load existing data if file exists
if (fs.existsSync(dbFilePath)) {
  try {
    const raw = fs.readFileSync(dbFilePath, 'utf8');
    settingsStore = JSON.parse(raw) || {};
  } catch (err) {
    console.warn('[Database] Could not read existing settings file, initializing new store:', err.message);
    settingsStore = {};
  }
}

// Atomic file save to prevent corruption
function saveStore() {
  try {
    const tempPath = `${dbFilePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(settingsStore, null, 2), 'utf8');
    fs.renameSync(tempPath, dbFilePath);
  } catch (err) {
    console.error('[Database Save Error]:', err.message);
  }
}

function getDefaultSettings(guildId) {
  return {
    guild_id: String(guildId),
    prefix: '!',
    dj_role: null,
    default_volume: 80,
    announce_channel: null,
    twenty_four_seven: 0,
    autoplay: 0
  };
}

function ensureGuild(guildId) {
  const id = String(guildId);
  if (!settingsStore[id]) {
    settingsStore[id] = getDefaultSettings(id);
    saveStore();
  }
}

module.exports = {
  getSettings(guildId) {
    const id = String(guildId);
    ensureGuild(id);
    // Ensure all default fields exist (e.g. schema additions like autoplay)
    return {
      ...getDefaultSettings(id),
      ...settingsStore[id]
    };
  },
  setPrefix(guildId, prefix) {
    const id = String(guildId);
    ensureGuild(id);
    settingsStore[id].prefix = prefix;
    saveStore();
  },
  setDJRole(guildId, roleId) {
    const id = String(guildId);
    ensureGuild(id);
    settingsStore[id].dj_role = roleId;
    saveStore();
  },
  setDefaultVolume(guildId, volume) {
    const id = String(guildId);
    ensureGuild(id);
    settingsStore[id].default_volume = volume;
    saveStore();
  },
  setAnnounceChannel(guildId, channelId) {
    const id = String(guildId);
    ensureGuild(id);
    settingsStore[id].announce_channel = channelId;
    saveStore();
  },
  set247(guildId, enabled) {
    const id = String(guildId);
    ensureGuild(id);
    settingsStore[id].twenty_four_seven = enabled ? 1 : 0;
    saveStore();
  },
  setAutoplay(guildId, enabled) {
    const id = String(guildId);
    ensureGuild(id);
    settingsStore[id].autoplay = enabled ? 1 : 0;
    saveStore();
  }
};
