import mongoose, { Document, Schema } from "mongoose";

export interface ICommunityRead extends Document {
  userId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  lastReadAt: Date;
}

const CommunityReadSchema = new Schema<ICommunityRead>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "CommunityGroup",
      required: true,
    },
    lastReadAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true },
);

CommunityReadSchema.index({ userId: 1, groupId: 1 }, { unique: true });

export default mongoose.models.CommunityRead ||
  mongoose.model<ICommunityRead>("CommunityRead", CommunityReadSchema);
