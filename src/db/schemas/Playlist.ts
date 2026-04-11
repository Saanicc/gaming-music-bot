import mongoose, { InferSchemaType, Document } from "mongoose";

type Playlist = {
  name: string;
  trackUrls: string[];
};

interface IPlaylist extends Document {
  guildId: string;
  playlists: Playlist[];
}

const playlistSchema = new mongoose.Schema<IPlaylist>({
  guildId: {
    type: String,
    required: true,
  },
  playlists: {
    type: [Object],
    required: true,
  },
});

export const Playlist = mongoose.model<IPlaylist>("playlist", playlistSchema);

export type PlaylistType = InferSchemaType<typeof playlistSchema>;
