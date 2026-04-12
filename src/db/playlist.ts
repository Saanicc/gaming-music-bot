import { MAX_PLAYLISTS } from "../utils/constants";
import { GuildPlaylists, type Playlist } from "./schemas/Playlist";

/**
 * Find all playlists for a specific guild
 * @param guildId The Discord guild ID
 */
export const findPlaylistsByGuildId = async (guildId: string) => {
  const res = await GuildPlaylists.findOne({ guildId });
  return res?.playlists || [];
};

/**
 * Find a playlist by ID in a guild
 * @param guildId The Discord guild ID
 * @param id The ID of the playlist to find
 */
export const findPlaylistById = async (guildId: string, id: string) => {
  const res = await GuildPlaylists.findOne(
    { guildId, "playlists.id": id },
    { "playlists.$": 1 }
  );
  return res?.playlists?.[0] || null;
};

/**
 * Find a playlist by name in a guild
 * @param guildId The Discord guild ID
 * @param name The name of the playlist to find
 */
export const findPlaylistByName = async (guildId: string, name: string) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const res = await GuildPlaylists.findOne(
    {
      guildId,
      "playlists.name": {
        $regex: new RegExp(`^${escapedName}$`, "i"),
      },
    },
    { "playlists.$": 1 }
  );
  return res?.playlists?.[0] || null;
};

/**
 * Add a new playlist to a guild's collection
 * @param guildId The Discord guild ID
 * @param playlist The playlist object to add
 */
export const createPlaylist = async (
  guildId: string,
  playlist: Omit<Playlist, "id">
) => {
  const numberOfPlaylists = await findPlaylistsByGuildId(guildId);
  if (numberOfPlaylists.length >= MAX_PLAYLISTS) {
    throw new Error("Maximum number of playlists reached");
  }

  const existingPlaylist = await findPlaylistByName(guildId, playlist.name);
  if (existingPlaylist) {
    throw new Error("Playlist name already exists");
  }

  const res = await GuildPlaylists.findOneAndUpdate(
    { guildId },
    {
      $push: {
        playlists: {
          ...playlist,
          id: crypto.randomUUID(),
        },
      },
      $setOnInsert: { guildId },
    },
    { upsert: true, new: true }
  );

  return res;
};

/**
 * Update an existing playlist in a guild
 * @param guildId The Discord guild ID
 * @param playlistId The ID of the playlist to update
 * @param updatedData Partial playlist data to update (name, trackUrls)
 */
export const updatePlaylist = async (
  guildId: string,
  playlistId: string,
  updatedData: Partial<Playlist>
) => {
  if (updatedData.name) {
    const existingPlaylist = await findPlaylistByName(
      guildId,
      updatedData.name
    );
    if (existingPlaylist && existingPlaylist.id !== playlistId) {
      throw new Error("Playlist name already exists");
    }
  }

  const updateQuery: any = {};
  if (updatedData.name) updateQuery["playlists.$.name"] = updatedData.name;
  if (updatedData.trackUrls)
    updateQuery["playlists.$.trackUrls"] = updatedData.trackUrls;

  return GuildPlaylists.updateOne(
    { guildId, "playlists.id": playlistId },
    { $set: updateQuery }
  );
};

/**
 * Delete a playlist from a guild's collection
 * @param guildId The Discord guild ID
 * @param playlistId The ID of the playlist to delete
 */
export const deletePlaylist = async (guildId: string, playlistId: string) => {
  return GuildPlaylists.updateOne(
    { guildId },
    { $pull: { playlists: { id: playlistId } } }
  );
};
