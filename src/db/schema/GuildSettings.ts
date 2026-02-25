import mongoose, { InferSchemaType, Document, Schema } from "mongoose";
import { SUPPORTED_LANGUAGES } from "../../ui/translations";

interface IGuildSettings extends Document {
  guildId: string;
  language: string;
}

const guildSettingsSchema = new Schema<IGuildSettings>({
  guildId: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    required: true,
    enum: SUPPORTED_LANGUAGES,
  },
});

export const GuildSettings = mongoose.model<IGuildSettings>(
  "guildSettings",
  guildSettingsSchema
);

export type GuildSettingsType = InferSchemaType<typeof guildSettingsSchema>;
