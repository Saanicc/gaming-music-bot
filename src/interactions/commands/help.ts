import {
  ApplicationCommand,
  ApplicationCommandOptionType,
  ApplicationCommandSubGroup,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { Font } from "canvacord";
import { guardReply } from "@/src/utils/helpers/interactionGuard";
import { HelpBuilder, CommandData } from "@/src/utils/helpers/HelpBuilder";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("View a list of commands and how to use them.");

export async function execute(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) return guardReply(interaction, "NO_GUILD");

  await interaction.deferReply();

  const commands = await guild.commands.fetch();

  Font.loadDefault();

  function getCommandList(
    command: ApplicationCommand | ApplicationCommandSubGroup,
    prefix: string = ""
  ): CommandData[] {
    let commands = [];
    const fullName = `${prefix}${command.name}`;

    if (
      !command.options ||
      !command.options.some(
        (opt) =>
          opt.type === ApplicationCommandOptionType.Subcommand ||
          opt.type === ApplicationCommandOptionType.SubcommandGroup
      )
    ) {
      commands.push({
        name: fullName,
        description: command.description,
      });
    } else {
      command.options.forEach((opt) => {
        if (opt.type === ApplicationCommandOptionType.Subcommand) {
          commands.push({
            name: `${fullName} ${opt.name}`,
            description: opt.description,
          });
        } else if (opt.type === ApplicationCommandOptionType.SubcommandGroup) {
          commands.push(...getCommandList(opt, `${fullName} `));
        }
      });
    }
    return commands;
  }

  const commandList = commands
    .filter((command) => command.name !== "help")
    .map((command) => getCommandList(command))
    .flat();

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
