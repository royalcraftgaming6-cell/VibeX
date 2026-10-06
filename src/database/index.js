const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'wizard_music.db'));

// Initialize settings schema
db.exec(`
  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    prefix TEXT DEFAULT '!',
    dj_role TEXT DEFAULT NULL,
    default_volume INTEGER DEFAULT 80,
    announce_channel TEXT DEFAULT NULL,
    twenty_four_seven INTEGER DEFAULT 0
  );
`);

const stmtGetSettings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?');
const stmtInsertDefault = db.prepare(`
  INSERT OR IGNORE INTO guild_settings (guild_id, prefix, dj_role, default_volume, announce_channel, twenty_four_seven)
  VALUES (?, '!', NULL, 80, NULL, 0)
`);
const stmtUpdatePrefix = db.prepare('UPDATE guild_settings SET prefix = ? WHERE guild_id = ?');
const stmtUpdateDJ = db.prepare('UPDATE guild_settings SET dj_role = ? WHERE guild_id = ?');
const stmtUpdateVolume = db.prepare('UPDATE guild_settings SET default_volume = ? WHERE guild_id = ?');
const stmtUpdateAnnounce = db.prepare('UPDATE guild_settings SET announce_channel = ? WHERE guild_id = ?');
const stmtUpdate247 = db.prepare('UPDATE guild_settings SET twenty_four_seven = ? WHERE guild_id = ?');

function ensureGuild(guildId) {
  stmtInsertDefault.run(guildId);
}

module.exports = {
  getSettings(guildId) {
    ensureGuild(guildId);
    return stmtGetSettings.get(guildId);
  },
  setPrefix(guildId, prefix) {
    ensureGuild(guildId);
    stmtUpdatePrefix.run(prefix, guildId);
  },
  setDJRole(guildId, roleId) {
    ensureGuild(guildId);
    stmtUpdateDJ.run(roleId, guildId);
  },
  setDefaultVolume(guildId, volume) {
    ensureGuild(guildId);
    stmtUpdateVolume.run(volume, guildId);
  },
  setAnnounceChannel(guildId, channelId) {
    ensureGuild(guildId);
    stmtUpdateAnnounce.run(channelId, guildId);
  },
  set247(guildId, enabled) {
    ensureGuild(guildId);
    stmtUpdate247.run(enabled ? 1 : 0, guildId);
  }
};
