/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { isAdmin } from "@/lib/auth";
import Course from "@/models/Course";
export async function GET() {
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
  const courses = await Course.find()
    .select("name slug description seoTitle seoDescription thumbnail")
    .lean();
  const issues: any[] = [];
  for (const c of courses) {
    if (!c.seoTitle)
      issues.push({
        page: c.name,
        issue: "Missing SEO title",
        severity: "High",
      });
    if (!c.seoDescription)
      issues.push({
        page: c.name,
        issue: "Missing SEO description",
        severity: "Medium",
      });
    if (!c.thumbnail)
      issues.push({
        page: c.name,
        issue: "Missing OG image",
        severity: "Low",
      });
    if (!c.slug)
      issues.push({
        page: c.name,
        issue: "Missing canonical slug",
        severity: "High",
      });
  }
  const score = Math.max(0, 100 - Math.min(90, issues.length * 8));
  return NextResponse.json({
    success: true,
    score,
    issues,
    courses,
  });
}
