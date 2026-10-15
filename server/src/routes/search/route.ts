/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Course from "@/models/Course";
import BlogPost from "@/models/BlogPost";
export async function GET(req: Request) {
  await connectDB();
  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  if (!q)
    return NextResponse.json({
      success: true,
      courses: [],
      posts: [],
    });
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const [courses, posts] = await Promise.all([
    Course.find({
      published: true,
      $or: [
        {
          name: re,
        },
        {
          description: re,
        },
        {
          category: re,
        },
      ],
    })
      .limit(8)
      .lean(),
    BlogPost.find({
      published: true,
      $or: [
        {
          title: re,
        },
        {
          excerpt: re,
        },
        {
          category: re,
        },
      ],
    })
      .limit(8)
      .lean(),
  ]);
  return NextResponse.json({
    success: true,
    courses,
    posts,
  });
}
