# 🧙‍♂️ Wizard Music — Discord Music Bot

A Discord music bot featuring both **Slash Commands** (`/`) and **Prefix Commands** (`!`), dynamic player controls with interactive buttons, per-guild music queues, persistent server settings with SQLite, and 24/7 mode.

---

## 🚀 Features

- **Dual Command Interface:** Full support for both **Slash Commands** (`/play`, `/skip`, etc.) and configurable **Prefix Commands** (`!play`, `!skip`, etc.).
- **Rich Player UI:** Live *Now Playing* embeds with dynamic progress bars (`01:32 / 03:45`) and clickable control buttons (⏮️, ⏸️/▶️, ⏭️, 🔁, 🔀, ⏹️).
- **Per-Guild Sessions:** Isolated queues and player instances for each Discord server.
- **Persistent Settings (SQLite):** Configurable prefix, DJ roles, default volumes, and 24/7 persistent voice mode saved in SQLite (`data/wizard_music.db`).
- **DJ Permission System:** Restrict playback controls (`skip`, `stop`, `loop`, `shuffle`, `volume`) to users with the DJ role or Administrator rights.

---

## 📋 Prerequisites & Setup

### 1. Configure Credentials
Open the [.env](file:///c:/Users/Admi/Documents/bot%20discord/.env) file in the root directory and add your Discord bot credentials:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id_here
DEFAULT_PREFIX=!
DEFAULT_VOLUME=80
```

> **How to get your Bot Token and Client ID:**
> 1. Visit the [Discord Developer Portal](https://discord.com/developers/applications).
> 2. Click **New Application** and give it a name (e.g. *Wizard Music*).
> 3. Under **Bot**, click **Reset Token** and copy the token into `DISCORD_TOKEN`.
> 4. In the **Privileged Gateway Intents** section, enable:
>    - **Message Content Intent** (required for prefix commands)
>    - **Server Members Intent**
> 5. Under **OAuth2**, copy your **Client ID** into `CLIENT_ID`.
> 6. Under **OAuth2 -> URL Generator**, select `bot` and `applications.commands` scopes, check `Administrator` (or voice & message permissions), and use the generated link to invite the bot to your server.

---

## 🏃 Running the Bot

### Deploy Slash Commands
Register all Slash commands globally to Discord:
```bash
npm run deploy
```

### Start the Bot
Start the bot process:
```bash
npm start
```

---

## 📜 Available Commands

| Command | Aliases | Description | Permission |
| :--- | :--- | :--- | :--- |
| `/play <query>` | `!p`, `!play` | Play a track from YouTube, SoundCloud, or direct audio link | Everyone |
| `/pause` | `!pause` | Pause active playback | DJ |
| `/resume` | `!resume`, `!unpause` | Resume paused playback | DJ |
| `/skip` | `!s`, `!skip` | Skip the currently playing track | DJ |
| `/stop` | `!stop`, `!leave` | Stop music, clear queue, and leave voice channel | DJ |
| `/queue [page]`| `!q`, `!queue` | View upcoming tracks in the server queue | Everyone |
| `/nowplaying` | `!np`, `!current` | View current track details with live progress bar and buttons | Everyone |
| `/volume [1-100]`| `!vol`, `!v` | Adjust the playback volume | DJ |
| `/loop [mode]` | `!loop`, `!repeat`| Cycle loop mode: Off ❌ / Track 🔂 / Queue 🔁 | DJ |
| `/shuffle` | `!shuffle`, `!mix`| Randomize remaining songs in the queue | DJ |
| `/settings` | `!settings`, `!conf`| View server configuration | Everyone |
| `/prefix <new>`| `!prefix` | Update custom server prefix | Admin |
| `/dj [@role]` | `!dj` | Assign or clear required DJ role | Admin |
| `/247 [on/off]`| `!247` | Toggle 24/7 continuous voice connection | Admin |
| `/ping` | `!ping`, `!p` | View bot and Discord websocket latency | Everyone |
| `/stats` | `!stats`, `!info`| View server counts, memory usage, uptime | Everyone |
| `/help` | `!help`, `!h` | Display the commands guide | Everyone |

---

## 🗄️ Architecture Overview

- [src/index.js](file:///c:/Users/Admi/Documents/bot%20discord/src/index.js): Application bootstrap & intent configuration.
- [src/music/Manager.js](file:///c:/Users/Admi/Documents/bot%20discord/src/music/Manager.js): Music session coordinator & source resolver.
- [src/music/Player.js](file:///c:/Users/Admi/Documents/bot%20discord/src/music/Player.js): Voice connection & audio player lifecycle.
- [src/music/Queue.js](file:///c:/Users/Admi/Documents/bot%20discord/src/music/Queue.js): Queue data structures.
- [src/database/index.js](file:///c:/Users/Admi/Documents/bot%20discord/src/database/index.js): SQLite database operations.
- [src/utils/embed.js](file:///c:/Users/Admi/Documents/bot%20discord/src/utils/embed.js): Now Playing embeds & interactive button rows.
