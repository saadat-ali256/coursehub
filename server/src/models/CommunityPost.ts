/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface ICommunityPost extends Document {
  userId: mongoose.Types.ObjectId;
  text: string;
  imageUrl?: string;
  sourceType?: "course" | "blog";
  sourceId?: string;
  contentUrl?: string;
  contentTitle?: string;
  contentImage?: string;
  likes: mongoose.Types.ObjectId[];
  reactions: {
    userId: mongoose.Types.ObjectId;
    type: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}
const S = new Schema<ICommunityPost>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },
    imageUrl: {
      type: String,
    },
    sourceType: {
      type: String,
      enum: ["course", "blog"],
    },
    sourceId: {
      type: String,
    },
    contentUrl: {
      type: String,
    },
    contentTitle: {
      type: String,
    },
    contentImage: {
      type: String,
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    reactions: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        type: {
          type: String,
          enum: ["❤️", "👍", "😂", "🔥", "👏", "🎉"],
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);
S.index({ sourceType: 1, sourceId: 1 }, { sparse: true });
S.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
export default mongoose.models.CommunityPost ||
  mongoose.model<ICommunityPost>("CommunityPost", S);
