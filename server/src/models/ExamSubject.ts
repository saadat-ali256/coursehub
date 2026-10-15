import mongoose, { Document, Schema } from "mongoose";

export interface IExamSubject extends Document {
  name: string;
  slug: string;
  category: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const ExamSubjectSchema = new Schema<IExamSubject>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: "", maxlength: 500 },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.models.ExamSubject ||
  mongoose.model<IExamSubject>("ExamSubject", ExamSubjectSchema);
