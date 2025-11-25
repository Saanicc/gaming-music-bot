## ⚙️ Configuration File (`bot-config.json`)

The `bot-config.json` file contains all customizable settings for the bot, allowing you to easily adjust leveling systems, rank tiers, colors, and emojis without modifying the core code.

### 📝 Structure Reference

| Section    | Description                                                                                  | Customization Examples                                          |
| :--------- | :------------------------------------------------------------------------------------------- | :-------------------------------------------------------------- |
| `leveling` | Controls the XP gain and level-up requirements.                                              | Change the difficulty of the level curve.                       |
| `colors`   | Defines the hexadecimal color codes used for various embed types (e.g., Now Playing, Error). | Adjust the bot's color scheme to match your server theme.       |
| `emojis`   | Contains Discord custom emoji IDs for UI controls and XP rewards.                            | Update reaction emojis for player controls and status updates.  |
| `ranks`    | An ordered list defining the rank tiers, their required levels, and associated assets.       | Add, remove, or rename rank tiers (e.g., "Legend" at level 50). |

---

### `leveling`

This object defines the base values used in the Experience Point (XP) calculation.

| Key                  | Type     | Default Value (Example) | Description                                                                    |
| :------------------- | :------- | :---------------------- | :----------------------------------------------------------------------------- |
| `xpBase`             | `number` | `3`                     | The minimum XP earned per song play/interaction.                               |
| `formula.base`       | `number` | `10`                    | Base difficulty constant for the level-up formula.                             |
| `formula.multiplier` | `number` | `12`                    | Controls how quickly the required XP increases per level. **Higher = Harder.** |
| `formula.exponent`   | `number` | `1.2`                   | Fine-tunes the exponential curve of the leveling system.                       |

---

### `colors`

All values must be standard **Hexadecimal Strings** (starting with `#`), like `#5865f2`.

| Key                           | Default Value (Example) | Description                                               |
| :---------------------------- | :---------------------- | :-------------------------------------------------------- |
| `nowPlaying`                  | `#5865f2`               | Color for embeds showing currently playing music.         |
| `error`                       | `#ed4245`               | Color for error and failure messages.                     |
| `success`                     | `#57f287`               | Color for successful actions (e.g., song added to queue). |
| `default`                     | `#2b2d31`               | General purpose embed color.                              |
| _... (all other color types)_ |                         |                                                           |

---

### `emojis`

This section is divided into `ui` (player controls) and `xp` (reward/status icons).

**IMPORTANT:** Emojis must be in the Discord format `<:name:id>` or `<a:name:id>` if animated.

| Category | Key         | Default Value (Example)  | Description                                    |
| :------- | :---------- | :----------------------- | :--------------------------------------------- |
| `ui`     | `play`      | `<:play:123456789>`      | The emoji used for the "Play" button/status.   |
| `ui`     | `levelup`   | `<:levelup:123456789>`   | The emoji displayed on level-up notifications. |
| `xp`     | `legendary` | `<:legendary:123456789>` | Emoji used for high-tier XP rewards.           |
| ...      |             |                          |

---

### `ranks`

This is an **array of objects** defining all rank tiers. **The order in this array is important for display and lookup.**

| Key        | Type     | Description                                                                              |
| :--------- | :------- | :--------------------------------------------------------------------------------------- |
| `id`       | `string` | A unique internal identifier (e.g., `grandmaster`).                                      |
| `minLevel` | `number` | The minimum user level required to obtain this rank. **Ensure these levels are unique.** |
| `title`    | `string` | The display name of the rank (e.g., "Grandmaster DJ").                                   |
| `emoji`    | `string` | The Discord custom emoji associated with this rank.                                      |
| `imageUrl` | `string` | A public URL to an image asset for this rank (used in profile cards).                    |

#### Adding a New Rank

To add a new rank, simply insert a new object into the array, ensuring you assign it a unique `id` and `minLevel`. It is recommended to keep the array sorted by `minLevel` (highest level first) for easy readability.
