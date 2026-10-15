/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface ICommunityGroup extends Document {
  name: string;
  description: string;
  avatarUrl?: string;
  audience: "subscribers" | "everyone";
  createdBy: mongoose.Types.ObjectId;
  active: boolean;
  memberIds: mongoose.Types.ObjectId[];
  memberAccessRestricted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const SchemaDef = new Schema<ICommunityGroup>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    audience: {
      type: String,
      enum: ["subscribers", "everyone"],
      default: "subscribers",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    memberIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    memberAccessRestricted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);
export default mongoose.models.CommunityGroup ||
  mongoose.model<ICommunityGroup>("CommunityGroup", SchemaDef);
