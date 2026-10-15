/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireUser } from "@/lib/api-helpers";
import Certificate from "@/models/Certificate";
export async function GET(req: Request) {
  await connectDB();
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const c = await Certificate.findOne({
      certificateId: id,
    })
      .populate("userId", "_id name")
      .populate("courseId", "name instructor")
      .lean();
    if (!c)
      return NextResponse.json(
        {
          success: false,
          authentic: false,
          valid: false,
          message: "Certificate not found",
        },
        {
          status: 404,
        },
      );
    const authentic = true;
    const valid = c.status !== "revoked" && c.verified !== false;
    return NextResponse.json({
      success: true,
      authentic,
      valid,
      certificate: c,
    });
  }
  const { user, response } = await requireUser();
  if (response) return response;
  return NextResponse.json({
    success: true,
    certificates: await Certificate.find({
      userId: user!._id,
    })
      .populate("courseId", "name instructor")
      .sort({
        issuedAt: -1,
      })
      .lean(),
  });
}
export async function POST(_req: Request) {
  const { response } = await requireUser();
  if (response) return response;
  return NextResponse.json(
    {
      success: false,
      message: "Certificates are issued automatically only after passing the course final exam.",
    },
    { status: 410 },
  );
}
