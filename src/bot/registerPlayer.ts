import { Client } from "discord.js";
import { AudioFilters, Player } from "discord-player";
import { registerPlayerExtractors } from "./registerPlayerExtractors.js";
import { registerPlayerEvents } from "./registerPlayerEvents.js";

export const registerPlayer = async (discordClient: Client) => {
  AudioFilters.define("loudnorm", "loudnorm=I=-16:LRA=11:TP=-1.5");

  const player = new Player(discordClient);
  await registerPlayerExtractors(player).catch(console.error);
  registerPlayerEvents(player);
};
