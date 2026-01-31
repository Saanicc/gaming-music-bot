import { ActivityType, Client, GatewayIntentBits } from "discord.js";
import { deployCommands } from "../deploy-commands";
import { setBotActivity } from "../utils/helpers/setBotActivity";
import { buttons } from "../interactions/buttons";
import { commands } from "../interactions/commands";
import { handleInteraction } from "../utils/helpers/handleInteraction";

const checkIfDevClient = async () => {
  if (process.env.NODE_ENV === "dev") {
    await deployCommands({
      guildId: process.env.DISCORD_GUILD_ID ?? "",
    });
  }
};

export const registerDiscordClient = () => {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once("clientReady", async () => {
    await checkIfDevClient();
    console.log(`🤖 Logged in as ${client.user?.tag}`);
    await setBotActivity(client, "/help", ActivityType.Listening);
  });

  client.on("guildCreate", async (guild) => {
    await deployCommands({ guildId: guild.id });
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;
      await handleInteraction(interaction, commands, commandName);
    }
    if (interaction.isButton()) {
      const button = interaction.customId;
      await handleInteraction(interaction, buttons, button);
    }
  });

  client.on("error", (error) => {
    console.error(error);
  });

  return client;
};
