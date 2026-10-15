import mongoose, { Schema, Document } from "mongoose";

export interface IHeroSlide extends Document {
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  buttonLabel: string;
  buttonUrl: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const S = new Schema<IHeroSlide>(
  {
    eyebrow: { type: String, default: "", trim: true, maxlength: 80 },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, default: "", trim: true, maxlength: 360 },
    imageUrl: { type: String, default: "", trim: true, maxlength: 2048 },
    imageAlt: { type: String, default: "", trim: true, maxlength: 180 },
    buttonLabel: { type: String, default: "", trim: true, maxlength: 48 },
    buttonUrl: { type: String, default: "", trim: true, maxlength: 2048 },
    sortOrder: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.models.HeroSlide ||
  mongoose.model<IHeroSlide>("HeroSlide", S);
