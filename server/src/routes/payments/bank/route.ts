/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import PremiumPlan from "@/models/PremiumPlan";
import Payment from "@/models/Payment";
export async function GET() {
  return NextResponse.json({
    success: true,
    bank: {
      bankName: process.env.BANK_NAME || "",
      accountTitle: process.env.BANK_ACCOUNT_TITLE || "",
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || "",
      iban: process.env.BANK_IBAN || "",
      instructions:
        process.env.BANK_TRANSFER_INSTRUCTIONS ||
        "Transfer the exact amount and submit your reference.",
    },
  });
}
export async function POST(req: Request) {
  const u = await getCurrentUser();
  if (!u)
    return NextResponse.json(
      {
        success: false,
        message: "Login required",
      },
      {
        status: 401,
      },
    );
  const b = await req.json();
  await connectDB();
  const plan = await PremiumPlan.findById(b.planId);
  if (!plan)
    return NextResponse.json(
      {
        success: false,
        message: "Plan not found",
      },
      {
        status: 404,
      },
    );
  const p = await Payment.create({
    userId: u._id,
    planId: plan._id,
    provider: "bank",
    status: "verification_pending",
    amount: plan.price,
    currency: "USD",
    bankReference: String(b.bankReference || "").trim(),
    proofUrl: b.proofUrl || "",
  });
  return NextResponse.json(
    {
      success: true,
      paymentId: p._id,
      message: "Payment submitted for admin verification.",
    },
    {
      status: 201,
    },
  );
}
