/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { isAdmin } from "@/lib/auth";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import Payment from "@/models/Payment";
export async function GET(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json(
      {
        success: false,
        message: "Admin access required",
      },
      {
        status: 403,
      },
    );
  await connectDB();
  const type = new URL(req.url).searchParams.get("type") || "users";
  let rows: any[] = [];
  let headers: string[] = [];
  if (type === "subscriptions") {
    const data = await Subscription.find()
      .populate("userId", "name email")
      .populate("courseId", "name price")
      .populate("planId", "name price interval")
      .sort({
        createdAt: -1,
      })
      .lean();
    headers = [
      "Customer",
      "Email",
      "Plan",
      "Provider",
      "Course",
      "Status",
      "Price",
      "Period Start",
      "Period End",
      "Stripe Subscription",
      "PayPal Subscription",
      "Created",
    ];
    rows = data.map((x: any) => [
      x.userId?.name || "",
      x.userId?.email || "",
      x.planId?.name || "",
      x.provider || "",
      x.courseId?.name || "",
      x.status,
      x.planId?.price ?? x.courseId?.price ?? "",
      x.currentPeriodStart ? new Date(x.currentPeriodStart).toISOString() : "",
      x.currentPeriodEnd ? new Date(x.currentPeriodEnd).toISOString() : "",
      x.stripeSubscriptionId || "",
      x.paypalSubscriptionId || "",
      x.createdAt ? new Date(x.createdAt).toISOString() : "",
    ]);
  } else if (type === "payments") {
    const data = await Payment.find()
      .populate("userId", "name email")
      .populate("planId", "name price interval")
      .sort({
        createdAt: -1,
      })
      .lean();
    headers = [
      "Customer",
      "Email",
      "Plan",
      "Provider",
      "Status",
      "Amount",
      "Currency",
      "Provider Payment ID",
      "Bank Reference",
      "Created",
    ];
    rows = data.map((x: any) => [
      x.userId?.name || "",
      x.userId?.email || "",
      x.planId?.name || "",
      x.provider,
      x.status,
      x.amount,
      x.currency,
      x.providerPaymentId || "",
      x.bankReference || "",
      x.createdAt ? new Date(x.createdAt).toISOString() : "",
    ]);
  } else {
    const data = await User.find()
      .select("name email role status emailVerified createdAt")
      .sort({
        createdAt: -1,
      })
      .lean();
    headers = ["Name", "Email", "Role", "Status", "Email Verified", "Created"];
    rows = data.map((x: any) => [
      x.name,
      x.email,
      x.role,
      x.status,
      x.emailVerified ? "Yes" : "No",
      x.createdAt ? new Date(x.createdAt).toISOString() : "",
    ]);
  }
  const clean = (v: any) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="${clean(type)}"><Table><Row>${headers
    .map((h) => `<Cell><Data ss:Type="String">${clean(h)}</Data></Cell>`)
    .join("")}</Row>${rows
    .map(
      (r) =>
        `<Row>${r
          .map(
            (v: any) =>
              `<Cell><Data ss:Type="String">${clean(v)}</Data></Cell>`,
          )
          .join("")}</Row>`,
    )
    .join("")}</Table></Worksheet></Workbook>`;
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="coursehub-${type}.xls"`,
    },
  });
}
