/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface IBlogPost extends Document {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  category: string;
  published: boolean;
  authorId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
const SchemaDef = new Schema<IBlogPost>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    excerpt: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
    },
    category: {
      type: String,
      default: "Study",
    },
    published: {
      type: Boolean,
      default: false,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);
export default mongoose.models.BlogPost ||
  mongoose.model<IBlogPost>("BlogPost", SchemaDef);
