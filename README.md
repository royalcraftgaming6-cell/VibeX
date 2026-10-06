# 🎵 VibeX — Professional Discord Music Bot

A Discord music bot featuring both **Slash Commands** (`/`) and **Prefix Commands** (`!`), dynamic player controls with interactive buttons, per-guild music queues, persistent server settings with SQLite, and 24/7 mode ready for **Render** deployment.

---

## 🚀 Features

- **Dual Command Interface:** Full support for both **Slash Commands** (`/play`, `/skip`, etc.) and configurable **Prefix Commands** (`!play`, `!skip`, etc.).
- **Rich Player UI:** Live *Now Playing* embeds with dynamic progress bars (`01:32 / 03:45`) and clickable control buttons (⏮️, ⏸️/▶️, ⏭️, 🔁, 🔀, ⏹️).
- **Per-Guild Sessions:** Isolated queues and player instances for each Discord server.
- **Persistent Settings (SQLite):** Configurable prefix, DJ roles, default volumes, and 24/7 persistent voice mode saved in SQLite (`data/wizard_music.db`).
- **DJ Permission System:** Restrict playback controls (`skip`, `stop`, `loop`, `shuffle`, `volume`) to users with the DJ role or Administrator rights.
- **Render 24/7 Ready:** Built-in HTTP health check and status server (`src/server.js`) listening on `$PORT` with `/health` endpoint to keep the bot active 24/7.
- **Rythm-Style Autoplay:** Seamlessly find and queue similar/recommended tracks when the queue finishes, with SQLite persistence per server.
- **Smart Fallback Engine:** Multi-source streaming supporting SoundCloud, Spotify metadata, YouTube, and direct audio files with automatic cloud fallback.

---

## 🌐 Deploying to Render (24/7 Hosting)

Deploying VibeX to Render is simple with the included [`render.yaml`](render.yaml):

### Step 1: Create a Render Account
1. Go to [Render.com](https://render.com/) and sign up with your GitHub account.

### Step 2: Deploy New Web Service
1. In your Render Dashboard, click **New +** → **Web Service**.
2. Connect your repository: **`royalcraftgaming6-cell/VibeX`**.
3. Configure the service:
   - **Name:** `vibex-music-bot`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free`

### Step 3: Add Environment Variables in Render
In the **Environment Variables** section, add:
- `DISCORD_TOKEN` = *(Your Discord Bot Token from Discord Developer Portal)*
- `CLIENT_ID` = `1557105182356148254`
- `DEFAULT_PREFIX` = `!`
- `DEFAULT_VOLUME` = `80`
- `PORT` = `10000`

Click **Create Web Service**. Render will install dependencies and start your bot!

### Step 4: Keep Bot Awake 24/7 for Free
Render's free tier spins down web services after 15 minutes of no HTTP requests. To keep VibeX awake 24/7:
1. Copy your Render web service URL (e.g. `https://vibex-music-bot.onrender.com`).
2. Go to a free ping monitor like [Cron-Job.org](https://cron-job.org/) or [UptimeRobot.com](https://uptimerobot.com/).
3. Add a new monitor for URL: `https://your-render-url.onrender.com/health` scheduled every **5 to 10 minutes**.
4. The bot will now remain active **24/7 indefinitely**!

---

## 🎧 What You Need to Listen to Music

To listen to music with VibeX in your Discord server:

1. **Invite the Bot with Voice Permissions:**
   Make sure the bot has the following Discord permissions in your server/voice channel:
   - `Connect` (Join Voice Channel)
   - `Speak` (Play Audio)
   - `Use Voice Activity`
   - `Send Messages` & `Embed Links` (Post player embeds and buttons)

2. **Join a Voice Channel:**
   Join any voice channel in your Discord server.

3. **Start Playing:**
   Type `/play <song name or link>` (e.g., `/play Alan Walker Faded` or `/play https://soundcloud.com/...`).
   - The bot will join your voice channel.
   - A rich **Now Playing** embed will appear with interactive control buttons.

4. **Enable 24/7 Mode (Optional):**
   Run `/247 on` so the bot stays connected in the voice channel even when playback stops!

---

## 📜 Available Commands

| Command | Aliases | Description | Permission |
| :--- | :--- | :--- | :--- |
| `/play <query>` | `!p`, `!play` | Play a track from SoundCloud, YouTube, Spotify, or direct link | Everyone |
| `/pause` | `!pause` | Pause active playback | DJ |
| `/resume` | `!resume`, `!unpause` | Resume paused playback | DJ |
| `/skip` | `!s`, `!skip` | Skip the currently playing track | DJ |
| `/stop` | `!stop`, `!leave` | Stop music, clear queue, and leave voice channel | DJ |
| `/queue [page]`| `!q`, `!queue` | View upcoming tracks in the server queue | Everyone |
| `/nowplaying` | `!np`, `!current` | View current track details with live progress bar and buttons | Everyone |
| `/volume [1-100]`| `!vol`, `!v` | Adjust the playback volume | DJ |
| `/loop [mode]` | `!loop`, `!repeat`| Cycle loop mode: Off ❌ / Track 🔂 / Queue 🔁 | DJ |
| `/autoplay [on/off]` | `!ap`, `!autoplay`| Toggle Rythm-style autoplay for similar songs | DJ |
| `/shuffle` | `!shuffle`, `!mix`| Randomize remaining songs in the queue | DJ |
| `/settings` | `!settings`, `!conf`| View server configuration | Everyone |
| `/prefix <new>`| `!prefix` | Update custom server prefix | Admin |
| `/dj [@role]` | `!dj` | Assign or clear required DJ role | Admin |
| `/247 [on/off]`| `!247` | Toggle 24/7 continuous voice connection | Admin |
| `/ping` | `!ping`, `!p` | View bot and Discord websocket latency | Everyone |
| `/stats` | `!stats`, `!info`| View server counts, memory usage, uptime | Everyone |
| `/help` | `!help`, `!h` | Display the commands guide | Everyone |
