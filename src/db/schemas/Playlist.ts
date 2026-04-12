import mongoose, { InferSchemaType, Document } from "mongoose";

export type Playlist = {
  id: string;
  name: string;
  trackUrls: string[];
};

interface IGuildPlaylists extends Document {
  guildId: string;
  playlists: Playlist[];
}

const playlistItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    trackUrls: { type: [String], required: true, default: [] },
  },
  { _id: false }
);

const playlistSchema = new mongoose.Schema<IGuildPlaylists>({
  guildId: {
    type: String,
    required: true,
  },
  playlists: {
    type: [playlistItemSchema],
    required: true,
    default: [],
  },
});

export const GuildPlaylists = mongoose.model<IGuildPlaylists>(
  "guild_playlists",
  playlistSchema
);

export type GuildPlaylistType = InferSchemaType<typeof playlistSchema>;
