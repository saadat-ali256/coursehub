import mongoose, { Schema, Document } from "mongoose";

export interface ILesson extends Document {
  courseId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  content: string;
  order: number;
  type?: string;
  duration?: number;
  published: boolean;
  preview: boolean;
  visibility: "public" | "premium";
  videoUrl?: string;
  thumbnail?: string;
  live?: boolean;
  meetingUrl?: string;
  resources?: string[];
  section?: string;
  category: string;
  releaseAt?: Date;
  required?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LessonSchema = new Schema<ILesson>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    content: { type: String, required: true },
    order: { type: Number, required: true, min: 1 },
    type: {
      type: String,
      default: "article",
      enum: ["article", "video", "quiz"],
    },
    duration: { type: Number, default: 10 },
    published: { type: Boolean, default: true },
    preview: { type: Boolean, default: false },
    visibility: {
      type: String,
      enum: ["public", "premium"],
      default: "premium",
    },
    videoUrl: { type: String },
    thumbnail: { type: String },
    live: { type: Boolean, default: false },
    meetingUrl: { type: String },
    resources: [{ type: String }],
    section: { type: String, default: "Section 1" },
    category: { type: String, required: true, trim: true, index: true },
    releaseAt: { type: Date },
    required: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Lesson =
  mongoose.models.Lesson || mongoose.model<ILesson>("Lesson", LessonSchema);
export default Lesson;
