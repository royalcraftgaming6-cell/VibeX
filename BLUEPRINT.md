# 🎵 WIZARD MUSIC — Discord Music Bot Blueprint

**Goal:** Build a professional Rythm-style Discord music bot with both Prefix and Slash Commands, a queue/player system, controls, permissions, server settings, 24/7 mode, testing, hosting, and a future dashboard.

> **Important:** The playback layer should use music/audio sources and APIs you are permitted to use. Do not design the bot around bypassing platform restrictions or extracting streams in ways that violate provider rules.

---

## 1. Project Vision
Wizard Music is planned as a scalable Discord music bot. The project should be built in small milestones so you can test one working feature before moving to the next.

**Final target:** Music playback → queue → controls → buttons/UI → DJ permissions → database → server settings → 24/7 → search → testing → VPS → public beta → dashboard → scaling.

---

## 2. High-Level Blueprint
```
DISCORD → WIZARD MUSIC BOT → COMMANDS / PLAYER / SETTINGS → MUSIC SESSION → VOICE CHANNEL
```
Each Discord server gets its own independent music session. A session contains the current player, queue, playback state, and server-specific controls.

---

## 3. Core Feature Groups
| Feature Group | Description |
| :--- | :--- |
| **🎵 Music** | Play, search, pause, resume, skip, stop, volume |
| **📜 Queue** | View, remove, clear, shuffle, loop |
| **🎛️ Player UI** | Now Playing embed, buttons, progress/status |
| **🛡️ Permissions** | DJ role, admin-only settings |
| **⚙️ Settings** | Prefix, DJ role, default volume, announcements |
| **♾️ 24/7** | Stay connected when enabled, with reconnect handling |
| **📊 Stats** | Servers, songs played, uptime and other bot metrics |
| **🌐 Dashboard** | Future web panel for server configuration |

---

## 4. Recommended Technology Stack
- **Language:** JavaScript
- **Runtime:** Node.js
- **Discord Library:** `discord.js`
- **Voice Library:** `@discordjs/voice`
- **Database:** SQLite initially; PostgreSQL later if needed
- **Caching / Scaling:** Redis later, only when needed
- **Development:** VS Code + Git
- **Hosting:** Local PC for development → VPS/cloud server for production

---

## 5. Suggested Project Structure
```
Wizard-Music/
├── src/
│   ├── commands/
│   │   ├── music/
│   │   │   ├── play.js
│   │   │   ├── pause.js
│   │   │   ├── resume.js
│   │   │   ├── skip.js
│   │   │   ├── stop.js
│   │   │   ├── queue.js
│   │   │   ├── shuffle.js
│   │   │   ├── loop.js
│   │   │   ├── autoplay.js
│   │   │   └── volume.js
│   │   └── settings/
│   │       ├── dj.js
│   │       ├── prefix.js
│   │       └── 247.js
│   ├── events/
│   ├── handlers/
│   │   ├── slashHandler.js
│   │   └── prefixHandler.js
│   ├── music/
│   │   ├── Player.js
│   │   ├── Queue.js
│   │   └── Manager.js
│   ├── database/
│   ├── utils/
│   └── index.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

---

## 6. Command Blueprint
| Category | Slash Commands | Prefix Commands |
| :--- | :--- | :--- |
| **Music** | `/play`, `/search` | `!play`, `!search` |
| **Playback** | `/pause`, `/resume`, `/skip`, `/stop` | `!pause`, `!resume`, `!skip`, `!stop` |
| **Queue** | `/queue`, `/remove`, `/clear`, `/shuffle` | `!queue`, `!remove`, `!clear`, `!shuffle` |
| **Loop/Volume/Autoplay** | `/loop`, `/volume`, `/autoplay` | `!loop`, `!volume`, `!autoplay`, `!ap` |
| **Info** | `/nowplaying`, `/help`, `/ping` | `!np`, `!help`, `!ping` |
| **Settings** | `/settings`, `/dj`, `/prefix`, `/247` | `!settings`, `!dj`, `!prefix`, `!247` |

---

## 7. Development Roadmap
- **Phase 0 — Planning:** Choose bot name, prefix, command groups, rules, permissions and first feature set.
- **Phase 1 — Environment:** Install Node.js, VS Code and Git. Create project and basic files.
- **Phase 2 — Bot Core:** Create Discord application, connect bot, configure intents, build `/ping` + `!ping`.
- **Phase 3 — Command Handler:** Separate Slash and Prefix command handling to scale cleanly.
- **Phase 4 — Voice:** Implement `/join` and `/leave`. Test voice connection/disconnection.
- **Phase 5 — Music Engine:** Get one supported track playing successfully.
- **Phase 6 — Queue:** Multiple tracks, automatic next-track playback, queue display & management.
- **Phase 7 — Controls:** Pause, resume, skip, stop, volume, loop, shuffle.
- **Phase 8 — UI:** Now Playing embeds and interactive buttons.
- **Phase 9 — DJ System:** DJ role checks and admin-only commands.
- **Phase 10 — Database:** Persist guild ID, prefix, DJ role, default volume, announcement channel, 24/7 mode.
- **Phase 11 — Server Settings:** Build `/settings` and make configuration server-specific.
- **Phase 12 — 24/7:** Persistent voice mode with reconnect/error handling.
- **Phase 13 — Search:** Search results and selection flow using supported sources.
- **Phase 14 — Advanced Audio:** Optional audio filters (bassboost, nightcore, 8D).
- **Phase 15 — Statistics:** Track bot statistics (servers, plays, uptime).
- **Phase 16 — Multi-server:** Verify independent players and queues for every guild.
- **Phase 17 — Testing:** Normal flows, permissions, error handling, voice disconnects.
- **Phase 18 — Hosting:** Move from local development to VPS/cloud.
- **Phase 19 — Public Beta:** Release to small group, collect logs, improve stability.
- **Phase 20 — Dashboard:** Web dashboard for server configuration.

---

## 8. Music Player Architecture
```
User
  ↓
/play or !play
  ↓
Command Handler
  ↓
Music Manager
  ↓
Search / Resolve Track
  ↓
Queue
  ↓
Player
  ↓
Audio Source
  ↓
Discord Voice Channel
```
The `MusicManager` creates or retrieves a player for the guild. The `Player` owns playback state, while the `Queue` owns the ordered list of tracks.

---

## 9. Queue Design
```
Server A
  └── Player A
      ├── Now Playing
      └── Queue A

Server B
  └── Player B
      ├── Now Playing
      └── Queue B
```
Never use one global queue for all servers. Guild ID is the key used to locate the correct music session.

---

## 10. Database Schema (SQLite)
| Field | Purpose |
| :--- | :--- |
| `guild_id` | Identifies the Discord server |
| `prefix` | Stores the server's custom prefix |
| `dj_role` | Stores the DJ role ID |
| `default_volume` | Default player volume |
| `announce_channel` | Optional music announcement channel |
| `twenty_four_seven` | Stores whether 24/7 mode is enabled |

---

## 11. UI Blueprint
```
╭────────────────────────╮
│      🎵 NOW PLAYING    │
│                        │
│      Song Name         │
│      Artist            │
│                        │
│  ⏱️ 01:32 / 03:45      │
│  ███████░░░            │
│                        │
│  🔊 80%                │
╰────────────────────────╯

    ⏮️   ⏸️   ⏭️
    🔀   🔁   ⏹️
```

---

## 12. Permission Blueprint
| Role | Typical Permissions |
| :--- | :--- |
| **Everyone** | `/play`, `/search`, `/queue`, `/nowplaying` |
| **DJ** | `skip`, `stop`, `shuffle`, `loop`, `volume` |
| **Admin** | server settings, prefix, DJ role, 24/7 configuration |

---

## 13. Testing Checklist
- [ ] Bot connects and stays online.
- [ ] Prefix and Slash commands both work.
- [ ] Bot joins and leaves voice channel reliably.
- [ ] One supported track plays correctly.
- [ ] Multiple tracks play in queue order.
- [ ] Pause / resume / skip / stop behave correctly.
- [ ] Loop and shuffle behave correctly.
- [ ] Buttons match current player state.
- [ ] Users without DJ permissions cannot perform restricted actions.
- [ ] Each server has an independent queue/player.
- [ ] Invalid commands and unavailable tracks return useful errors.
- [ ] Voice/network disconnects handled gracefully.
- [ ] Restarting bot preserves server settings.
- [ ] 24/7 mode reconnects correctly.

---

## 14. Golden Rule
> **Do not build everything at once.** The first milestone is:
> **`/play` → Bot joins VC → Audio plays → `/stop` → Bot leaves.**
