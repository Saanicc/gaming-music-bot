/**
 * Tests for playlist database operations.
 * Mocks: Mongoose model 'GuildPlaylists' via mongoose
 */

import {
  findPlaylistsByGuildId,
  findPlaylistById,
  findPlaylistByName,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
} from "../playlist";
import { GuildPlaylists } from "../schemas/Playlist";
import { MAX_PLAYLISTS } from "../../utils/constants";

// Mock the Playlist schema
jest.mock("../schemas/Playlist", () => ({
  GuildPlaylists: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
  },
}));

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: jest.fn().mockReturnValue("mocked-uuid-1234"),
  },
});

describe("playlist DB functions", () => {
  const guildId = "guild-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findPlaylistsByGuildId", () => {
    it("should return playlists when guild has playlists", async () => {
      const mockPlaylists = [{ id: "1", name: "test", trackUrls: [] }];
      (GuildPlaylists.findOne as jest.Mock).mockResolvedValue({
        playlists: mockPlaylists,
      });

      const result = await findPlaylistsByGuildId(guildId);

      expect(GuildPlaylists.findOne).toHaveBeenCalledWith({ guildId });
      expect(result).toEqual(mockPlaylists);
    });

    it("should return an empty array if no playlists are found", async () => {
      (GuildPlaylists.findOne as jest.Mock).mockResolvedValue(null);

      const result = await findPlaylistsByGuildId(guildId);

      expect(result).toEqual([]);
    });
  });

  describe("findPlaylistById", () => {
    it("should return the playlist when found", async () => {
      const mockPlaylist = { id: "1", name: "test", trackUrls: [] };
      (GuildPlaylists.findOne as jest.Mock).mockResolvedValue({
        playlists: [mockPlaylist],
      });

      const result = await findPlaylistById(guildId, "1");

      expect(GuildPlaylists.findOne).toHaveBeenCalledWith(
        { guildId, "playlists.id": "1" },
        { "playlists.$": 1 }
      );
      expect(result).toEqual(mockPlaylist);
    });

    it("should return null if the playlist is not found", async () => {
      (GuildPlaylists.findOne as jest.Mock).mockResolvedValue(null);

      const result = await findPlaylistById(guildId, "1");

      expect(result).toBeNull();
    });
  });

  describe("findPlaylistByName", () => {
    it("should return the playlist when found by name (case-insensitive)", async () => {
      const mockPlaylist = { id: "1", name: "My Playlist", trackUrls: [] };
      (GuildPlaylists.findOne as jest.Mock).mockResolvedValue({
        playlists: [mockPlaylist],
      });

      const result = await findPlaylistByName(guildId, "my playlist");

      expect(GuildPlaylists.findOne).toHaveBeenCalledWith(
        {
          guildId,
          "playlists.name": {
            $regex: new RegExp(`^my playlist$`, "i"),
          },
        },
        { "playlists.$": 1 }
      );
      expect(result).toEqual(mockPlaylist);
    });

    it("should correctly escape special RegExp characters", async () => {
      const mockPlaylist = { id: "1", name: "My *Playlist*", trackUrls: [] };
      (GuildPlaylists.findOne as jest.Mock).mockResolvedValue({
        playlists: [mockPlaylist],
      });

      const result = await findPlaylistByName(guildId, "My *Playlist*");

      expect(GuildPlaylists.findOne).toHaveBeenCalledWith(
        {
          guildId,
          "playlists.name": {
            $regex: new RegExp(`^My \\*Playlist\\*$`, "i"),
          },
        },
        { "playlists.$": 1 }
      );
      expect(result).toEqual(mockPlaylist);
    });

    it("should return null if no playlist matches the name", async () => {
      (GuildPlaylists.findOne as jest.Mock).mockResolvedValue(null);

      const result = await findPlaylistByName(guildId, "unknown");

      expect(result).toBeNull();
    });
  });

  describe("createPlaylist", () => {
    it("should successfully create a new playlist", async () => {
      (GuildPlaylists.findOne as jest.Mock).mockResolvedValueOnce({
        playlists: [],
      }); // Pre-check for MAX_PLAYLISTS
      (GuildPlaylists.findOne as jest.Mock).mockResolvedValueOnce(null); // Pre-check for duplicate name
      (GuildPlaylists.findOneAndUpdate as jest.Mock).mockResolvedValue({
        success: true,
      });

      const newPlaylist = { name: "Cool Tunes", trackUrls: ["http://url"] };
      const result = await createPlaylist(guildId, newPlaylist);

      expect(GuildPlaylists.findOneAndUpdate).toHaveBeenCalledWith(
        { guildId },
        {
          $push: {
            playlists: {
              ...newPlaylist,
              id: "mocked-uuid-1234",
            },
          },
          $setOnInsert: { guildId },
        },
        { upsert: true, new: true }
      );
      expect(result).toEqual({ success: true });
    });

    it("should throw an error if the maximum playlist limit is reached", async () => {
      const maxPlaylists = Array(MAX_PLAYLISTS).fill({ id: "x" });
      (GuildPlaylists.findOne as jest.Mock).mockResolvedValueOnce({
        playlists: maxPlaylists,
      }); // Pre-check for MAX_PLAYLISTS

      await expect(
        createPlaylist(guildId, { name: "Test", trackUrls: [] })
      ).rejects.toThrow(/^Maximum number of playlists reached$/);

      expect(GuildPlaylists.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it("should throw an error if the playlist name already exists", async () => {
      (GuildPlaylists.findOne as jest.Mock).mockResolvedValueOnce({
        playlists: [],
      }); // Pre-check for MAX_PLAYLISTS
      (GuildPlaylists.findOne as jest.Mock).mockResolvedValueOnce({
        playlists: [{ id: "1", name: "Dupe" }],
      }); // Pre-check for duplicate name

      await expect(
        createPlaylist(guildId, { name: "Dupe", trackUrls: [] })
      ).rejects.toThrow(/^Playlist name already exists$/);

      expect(GuildPlaylists.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe("updatePlaylist", () => {
    it("should update playlist details successfully when no name change triggers conflicts", async () => {
      (GuildPlaylists.findOne as jest.Mock).mockResolvedValue(null); // findPlaylistByName alias check
      (GuildPlaylists.updateOne as jest.Mock).mockResolvedValue({
        modifiedCount: 1,
      });

      const result = await updatePlaylist(guildId, "id-1", {
        name: "New Name",
        trackUrls: ["url-1"],
      });

      expect(GuildPlaylists.updateOne).toHaveBeenCalledWith(
        { guildId, "playlists.id": "id-1" },
        {
          $set: {
            "playlists.$.name": "New Name",
            "playlists.$.trackUrls": ["url-1"],
          },
        }
      );
      expect(result).toEqual({ modifiedCount: 1 });
    });

    it("should allow updating if the conflicting name belongs to the same playlist ID", async () => {
      (GuildPlaylists.findOne as jest.Mock).mockResolvedValue({
        playlists: [{ id: "id-1", name: "My Same Name" }],
      }); // Pretend we found the same exact playlist
      (GuildPlaylists.updateOne as jest.Mock).mockResolvedValue({
        modifiedCount: 1,
      });

      const result = await updatePlaylist(guildId, "id-1", {
        name: "My Same Name",
      });

      expect(GuildPlaylists.updateOne).toHaveBeenCalledWith(
        { guildId, "playlists.id": "id-1" },
        { $set: { "playlists.$.name": "My Same Name" } }
      );
      expect(result).toEqual({ modifiedCount: 1 });
    });

    it("should throw an error if the new name exists on a different playlist ID", async () => {
      (GuildPlaylists.findOne as jest.Mock).mockResolvedValue({
        playlists: [{ id: "different-id", name: "Collision" }],
      });

      await expect(
        updatePlaylist(guildId, "id-1", { name: "Collision" })
      ).rejects.toThrow(/^Playlist name already exists$/);

      expect(GuildPlaylists.updateOne).not.toHaveBeenCalled();
    });

    it("should only update trackUrls without checking name if name is undefined", async () => {
      (GuildPlaylists.updateOne as jest.Mock).mockResolvedValue({
        modifiedCount: 1,
      });

      const result = await updatePlaylist(guildId, "id-1", {
        trackUrls: ["url-2"],
      });

      expect(GuildPlaylists.findOne).not.toHaveBeenCalled(); // Name check should not be triggered
      expect(GuildPlaylists.updateOne).toHaveBeenCalledWith(
        { guildId, "playlists.id": "id-1" },
        {
          $set: {
            "playlists.$.trackUrls": ["url-2"],
          },
        }
      );
      expect(result).toEqual({ modifiedCount: 1 });
    });
  });

  describe("deletePlaylist", () => {
    it("should remove the playlist using $pull", async () => {
      (GuildPlaylists.updateOne as jest.Mock).mockResolvedValue({
        modifiedCount: 1,
      });

      const result = await deletePlaylist(guildId, "target-id");

      expect(GuildPlaylists.updateOne).toHaveBeenCalledWith(
        { guildId },
        {
          $pull: { playlists: { id: "target-id" } },
        }
      );
      expect(result).toEqual({ modifiedCount: 1 });
    });
  });
});
