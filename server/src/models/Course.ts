import mongoose, { Schema, Document } from "mongoose";

export interface ICourse extends Document {
  name: string;
  slug?: string;
  description: string;
  price: number;
  interval: string;
  category?: string;
  level?: string;
  instructor?: string;
  thumbnail?: string;
  featured: boolean;
  published: boolean;
  views: number;
  seoTitle?: string;
  seoDescription?: string;
  stripeProductId?: string;
  stripePriceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, index: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    interval: {
      type: String,
      required: true,
      enum: ["month", "year", "one-time"],
      default: "month",
    },
    category: { type: String, default: "General" },
    level: { type: String, default: "All levels" },
    instructor: { type: String, default: "CourseHub Instructor" },
    thumbnail: { type: String },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: false },
    views: { type: Number, default: 0, min: 0 },
    seoTitle: { type: String },
    seoDescription: { type: String },
    stripeProductId: { type: String },
    stripePriceId: { type: String },
  },
  { timestamps: true },
);

const Course =
  mongoose.models.Course || mongoose.model<ICourse>("Course", CourseSchema);
export default Course;
