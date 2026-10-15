/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface IPremiumPlan extends Document {
  name: string;
  slug: string;
  price: number;
  interval: "month" | "year";
  description: string;
  features: string[];
  active: boolean;
  stripePriceId?: string;
  paypalPlanId?: string;
  createdAt: Date;
  updatedAt: Date;
}
const S = new Schema<IPremiumPlan>(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    price: {
      type: Number,
      required: true,
    },
    interval: {
      type: String,
      enum: ["month", "year"],
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    features: {
      type: [String],
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
    },
    stripePriceId: {
      type: String,
    },
    paypalPlanId: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);
export default mongoose.models.PremiumPlan ||
  mongoose.model<IPremiumPlan>("PremiumPlan", S);
