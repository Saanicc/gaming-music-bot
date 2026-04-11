import { ModalSubmitInteraction } from "discord.js";

export const handleModalInteraction = async (
  interaction: ModalSubmitInteraction,
  collection: Record<string, { execute: (i: any) => Promise<any> }>,
  key: string
) => {
  const handler = collection[key as keyof typeof collection];

  if (!handler) return;

  await handler.execute(interaction);
};
