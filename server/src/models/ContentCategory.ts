import mongoose, { Document, Schema } from "mongoose";

export interface IContentCategory extends Document {
  name: string;
  key: string;
}

const ContentCategorySchema = new Schema<IContentCategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    key: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true },
);

export default mongoose.models.ContentCategory ||
  mongoose.model<IContentCategory>("ContentCategory", ContentCategorySchema);
