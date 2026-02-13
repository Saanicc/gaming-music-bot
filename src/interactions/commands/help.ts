import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { HelpBuilder, CommandData } from "@/utils/helpers/HelpBuilder";
import { Font } from "canvacord";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("View a list of commands and how to use them.");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const { commands } = await import("./index");

  Font.loadDefault();

  const commandList: CommandData[] = Object.values(commands)
    .map((cmd: any) => ({
      name: cmd.data.name,
      description: cmd.data.description,
    }))
    .filter((cmd: any) => cmd.name !== "help");

  const builder = new HelpBuilder()
    .setHeader({
      title: "Command List",
      subtitle: "Here you find all available commands",
      avatar: interaction.client.user.displayAvatarURL({
        extension: "png",
        size: 256,
      }),
    })
    .setCommands(commandList)
    .setFooterText(
      `${interaction.client.user.username} • Gaming music made simple`
    );

  const image = await builder.build();

  await interaction.editReply({ files: [image] });
}
