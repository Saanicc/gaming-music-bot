import {
  ApplicationCommand,
  ApplicationCommandOptionType,
  ApplicationCommandSubGroup,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { Font } from "canvacord";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { HelpBuilder, CommandData } from "@/utils/helpers/HelpBuilder";
import { useTranslations } from "@/utils/hooks/useTranslations";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Display the help message");

export async function execute(interaction: ChatInputCommandInteraction) {
  const t = useTranslations(interaction.guildId ?? "");

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
      title: t("commands.help.messages.title"),
      subtitle: t("commands.help.messages.subtitle"),
      avatar: interaction.client.user.displayAvatarURL({
        extension: "png",
        size: 256,
      }),
    })
    .setCommands(commandList)
    .setFooterText(
      t("commands.help.messages.footerText", {
        botName: interaction.client.user.username,
      })
    );

  const image = await builder.build();

  await interaction.editReply({ files: [image] });
}
