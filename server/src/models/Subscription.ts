/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  planId?: mongoose.Types.ObjectId;
  provider?: "stripe" | "paypal" | "bank" | "admin";
  grantedBy?: mongoose.Types.ObjectId;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  paypalSubscriptionId?: string;
  status: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}
const S = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "PremiumPlan",
    },
    provider: {
      type: String,
      enum: ["stripe", "paypal", "bank", "admin"],
    },
    grantedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    stripePriceId: String,
    paypalSubscriptionId: String,
    status: {
      type: String,
      required: true,
      default: "pending",
      index: true,
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
  },
  {
    timestamps: true,
  },
);
export default mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", S);
