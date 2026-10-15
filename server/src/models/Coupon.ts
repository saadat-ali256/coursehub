/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface ICoupon extends Document {
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  value: number;
  startAt?: Date;
  endAt?: Date;
  usageLimit?: number;
  perUserLimit: number;
  usedCount: number;
  minimumAmount: number;
  courseIds: mongoose.Types.ObjectId[];
  intervals: string[];
  firstTimeOnly: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const S = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    startAt: {
      type: Date,
    },
    endAt: {
      type: Date,
    },
    usageLimit: {
      type: Number,
    },
    perUserLimit: {
      type: Number,
      default: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    minimumAmount: {
      type: Number,
      default: 0,
    },
    courseIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    intervals: [String],
    firstTimeOnly: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);
export default mongoose.models.Coupon || mongoose.model<ICoupon>("Coupon", S);
