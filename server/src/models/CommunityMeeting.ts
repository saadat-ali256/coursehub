/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface ICommunityMeeting extends Document {
  title: string;
  meetingUrl: string;
  provider: "zoom" | "meet" | "other";
  startsAt?: Date;
  endsAt?: Date;
  active: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
const S = new Schema<ICommunityMeeting>(
  {
    title: {
      type: String,
      required: true,
    },
    meetingUrl: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      enum: ["zoom", "meet", "other"],
      default: "zoom",
    },
    startsAt: {
      type: Date,
    },
    endsAt: {
      type: Date,
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);
export default mongoose.models.CommunityMeeting ||
  mongoose.model<ICommunityMeeting>("CommunityMeeting", S);
