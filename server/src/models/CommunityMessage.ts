/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface ICommunityMessage extends Document {
  groupId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  text: string;
  replyTo?: mongoose.Types.ObjectId;
  attachmentUrl?: string;
  reactions?: Record<string, string[]>;
  createdAt: Date;
  updatedAt: Date;
}
const S = new Schema<ICommunityMessage>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "CommunityGroup",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: "CommunityMessage",
    },
    attachmentUrl: {
      type: String,
    },
    reactions: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);
S.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
export default mongoose.models.CommunityMessage ||
  mongoose.model<ICommunityMessage>("CommunityMessage", S);
