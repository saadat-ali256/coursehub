/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface IMedia extends Document {
  storageKey: string;
  storageProvider?: "local" | "s3";
  url?: string;
  originalName: string;
  mimeType: string;
  size: number;
  kind: "video" | "image" | "document";
  uploadedBy: mongoose.Types.ObjectId;
  private: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const S = new Schema<IMedia>(
  {
    storageKey: {
      type: String,
      required: true,
      index: true,
    },
    storageProvider: {
      type: String,
      enum: ["local", "s3"],
      default: "s3",
    },
    url: {
      type: String,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    kind: {
      type: String,
      enum: ["video", "image", "document"],
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    private: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);
export default mongoose.models.Media || mongoose.model<IMedia>("Media", S);
