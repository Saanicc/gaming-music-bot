import mongoose, { InferSchemaType, Document } from "mongoose";

export type TrackType = "horn" | "song";

interface IBossTrack extends Document {
  trackUrl: string;
  trackType: TrackType;
}

const bossTracksSchema = new mongoose.Schema<IBossTrack>({
  trackUrl: {
    type: String,
    required: true,
  },
  trackType: {
    type: String,
    required: true,
    enum: ["horn", "song"],
  },
});

export const BossTrack = mongoose.model<IBossTrack>(
  "bossTrack",
  bossTracksSchema
);

export type BossTrackType = InferSchemaType<typeof bossTracksSchema>;
