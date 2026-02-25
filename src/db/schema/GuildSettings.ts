import mongoose, { InferSchemaType, Document, Schema } from "mongoose";
import { LanguageCode, SUPPORTED_LANGUAGES } from "../../ui/translations";

interface IGuildSettings extends Document {
  guildId: string;
  language: LanguageCode;
}

const guildSettingsSchema = new Schema<IGuildSettings>({
  guildId: {
    type: String,
    required: true,
    unique: true,
    index: true,
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
