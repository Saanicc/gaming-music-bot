# Gaming music bot

**Gaming Music Bot** is a Discord bot that brings dynamic soundtracks to your gaming sessions.
Whether you’re relaxing with background music or preparing for an epic boss fight, this bot delivers the perfect vibe.
Summon it anytime to power up your gameplay with cinematic, high-energy music.

---

## Features

- **Play music from any `Spotify`, `Soundcloud` or `Youtube` URL**
- **Play boss music** from your pre-curated collection
- **Shuffles and reshuffles** boss tracks automatically
- **Dynamic "Now Playing" embed** with:
  - Song name
  - Artist
  - Album art
  - Progress bar
  - Track number and duration
  - Requester tag and DJ rank
- **DJ Rank and leaderboard system**
- **Interactive buttons**
- Clean, responsive embeds for a sleek experience

---

## Commands

| Command            | Description                                                                             |
| ------------------ | --------------------------------------------------------------------------------------- |
| `/play`            | Plays a track from a URL or search term.                                                |
| `/play_now`        | Plays a track from a url or search term, then plays it instantly.                       |
| `/play_next`       | Enqueues a track from a url or search term, then plays it after the current track ends. |
| `/play_boss_music` | Loads, shuffles and plays all boss tracks                                               |
| `/add_track`       | Add new track to the boss music collection                                              |
| `/help`            | Shows info about available commands                                                     |
| `/queue`           | Displays the next five upcoming tracks in the queue                                     |
| `/skip`            | Skip the currently playing song.                                                        |
| `/stop`            | Stops and disconnects the player.                                                       |
| `/rank`            | Check your (or another users) current DJ rank                                           |
| `/leaderboard`     | View the DJ leaderboard (top 8 DJs)                                                     |
| `/autoplay`        | Turn on/off autoplay                                                                    |
| `/loop-all`        | loops the current queue                                                                 |
| `/loop-current`    | loops the playing track                                                                 |
| `/loop-disable`    | Disables the loop mode                                                                  |
| `/nightcore`       | Turns on/off the nightcore audio filter                                                 |
| `/musicquiz`       | Start a music quiz in a thread!                                                         |
| `/play_random`     | Play a random track or playlist from a genre                                            |

---

## Button Controls

| Button       | Action                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------- |
| **Pause**    | Pauses music playback                                                                             |
| **Play**     | Resume music playback                                                                             |
| **⚔️**       | Loads/Reloads and shuffles all boss tracks                                                        |
| **🏆**       | Resumes old music queue if available, if not available it stops playback and leaves voice channel |
| **Stop**     | Stops playback and leaves the voice channel                                                       |
| **Next**     | Play the next track                                                                               |
| **Previous** | Play the previous track                                                                           |
| **Queue**    | Displays the next five upcoming tracks in the queue                                               |
| **💾**       | Save the currently playing track to the boss music library                                        |
| **🔂**       | Loops the current track                                                                           |
| **🔁**       | Loops the current queue                                                                           |

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/Saanicc/gaming-music-bot.git
cd gaming-music-bot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create a .env file in the root folder:

```
# Discord bot
DISCORD_TOKEN=your-bot-token
CLIENT_ID=your-client-id
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
YOUTUBE_COOKIE=your-youtube-cookie

# Mongo DB
MONGO_INITDB_DATABASE=musicbotdb                  # Change if you want
MONGO_URI=mongodb://localhost:27017/musicbotdb    # Authentication disabled by default
```

### 4. Configure the bot

A full guide on how to configure the bot is found [here](./docs/BOT_CONFIG.md)

### 5. Run the bot

For local development:

```bash
npm run dev
```

## Docker Compose Setup

A full guide on building and running the bot using Docker Compose can be found [here](./docs/DOCKER_README.md)

## Example Usage

When you’re facing a boss or epic challenge in-game:

```bash
/play_boss_music
```

The bot joins your voice channel and blasts a shuffled selection of your boss music collection.  
You’ll see a Now Playing embed with progress bar and interactive buttons.

> Make sure you've added tracks to your boss music collection using `/add_track` first

## How to add tracks to your boss music collection

Use the `/add_track` command and provide a track URL plus a track type.

**Track Types:**

`song` – Full music tracks played during boss fights or intense gameplay.

`horn` – Short horn sounds played randomly as an intro before the main track.

> The track URL must be a valid link from `Soundcloud`, `Spotify` or `YouTube`.

## Technical Notes

- Built with TypeScript and discord-player
- Self-hosted friendly — no external API costs
- Automatic queue and playback management

## License

This project is licensed under the MIT License — feel free to modify and self-host.
