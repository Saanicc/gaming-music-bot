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

const playlistSchema = new mongoose.Schema<IGuildPlaylists>({
  guildId: {
    type: String,
    required: true,
  },
  playlists: {
    type: [Object],
    required: true,
  },
});

export const GuildPlaylists = mongoose.model<IGuildPlaylists>(
  "guild_playlists",
  playlistSchema
);

export type GuildPlaylistType = InferSchemaType<typeof playlistSchema>;
