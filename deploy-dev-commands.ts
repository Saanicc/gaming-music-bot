import { deployCommands } from "./src/deploy-commands";

(async () => {
  deployCommands({
    guildId: process.env.DISCORD_GUILD_ID ?? "",
  });
})();
