/* AUTO-FORMATTED FOR READABILITY */
/* Data model: defines the MongoDB document structure for this feature. */
import mongoose, { Schema, Document } from "mongoose";
export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  planId?: mongoose.Types.ObjectId;
  provider: "stripe" | "paypal" | "bank";
  status: "pending" | "paid" | "failed" | "verification_pending" | "refunded";
  amount: number;
  currency: string;
  providerPaymentId?: string;
  stripeSubscriptionId?: string;
  bankReference?: string;
  proofUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
const S = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "PremiumPlan",
    },
    provider: {
      type: String,
      enum: ["stripe", "paypal", "bank"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "verification_pending", "refunded"],
      default: "pending",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "USD",
    },
    providerPaymentId: {
      type: String,
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
      index: true,
    },
    bankReference: {
      type: String,
    },
    proofUrl: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);
export default mongoose.models.Payment ||
  mongoose.model<IPayment>("Payment", S);
