/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import BlogPost from "@/models/BlogPost";
import Course from "@/models/Course";
import Lesson from "@/models/Lesson";
import { syncPublishedContentPost } from "@/lib/community-content";
import CommunityPost from "@/models/CommunityPost";
import { notifyUsersAboutPublishedContent } from "@/lib/course-notifications";
function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("admin") === "true") {
      if (!(await isAdmin()))
        return NextResponse.json(
          { success: false, message: "Admin access required" },
          { status: 403 },
        );
      await connectDB();
      const posts = await BlogPost.find()
        .sort({ createdAt: -1 })
        .populate("authorId", "name")
        .lean();
      return NextResponse.json({ success: true, posts });
    }

    await connectDB();
    const slug = url.searchParams.get("slug");
    if (slug) {
      const post = await BlogPost.findOne({ slug, published: true })
        .populate("authorId", "name")
        .lean();
      if (!post)
        return NextResponse.json(
          { success: false, message: "Blog post not found" },
          { status: 404 },
        );
      const lessons = await Lesson.find({
        category: post.category,
        published: true,
      })
        .select("_id courseId title description thumbnail duration type")
        .sort({ createdAt: -1 })
        .limit(6)
        .lean();
      const matchingCourses = await Course.find({
        _id: { $in: lessons.map((lesson) => lesson.courseId) },
        published: true,
      })
        .select("_id name")
        .lean();
      const coursesById = new Map(
        matchingCourses.map((course) => [String(course._id), course.name]),
      );
      return NextResponse.json({
        success: true,
        post,
        suggestions: lessons
          .filter((lesson) => coursesById.has(String(lesson.courseId)))
          .map((lesson) => ({
            ...lesson,
            courseName: coursesById.get(String(lesson.courseId)) || "Course",
          })),
      });
    }
    const posts = await BlogPost.find({
      published: true,
    })
      .sort({
        createdAt: -1,
      })
      .populate("authorId", "name");
    return NextResponse.json({
      success: true,
      posts,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load blog",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await isAdmin()))
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 },
      );

    const body = await request.json();
    const id = String(body.id || "");
    const title = String(body.title || "").trim();
    const category = String(body.category || "").trim();
    const content = String(body.content || "").trim();

    if (!id)
      return NextResponse.json(
        { success: false, message: "Blog post id is required" },
        { status: 400 },
      );
    if (!title || !category || !content)
      return NextResponse.json(
        {
          success: false,
          message: "Title, category, and article content are required.",
        },
        { status: 400 },
      );

    await connectDB();
    const post = await BlogPost.findById(id);
    if (!post)
      return NextResponse.json(
        { success: false, message: "Blog post not found" },
        { status: 404 },
      );

    const wasPublished = post.published;
    post.title = title;
    post.excerpt = String(body.excerpt || "").trim();
    post.content = content;
    post.coverImage = String(body.coverImage || "");
    post.category = category;
    post.published = body.published === true;
    await post.save();

    const author = await getCurrentUser();
    if (author) {
      await syncPublishedContentPost({
        sourceType: "blog",
        sourceId: String(post._id),
        userId: author._id,
        title: post.title,
        summary: post.excerpt || post.title,
        url: `/blog/${post.slug}`,
        imageUrl: post.coverImage,
        published: post.published,
      });
    } else if (!post.published) {
      await CommunityPost.deleteOne({
        sourceType: "blog",
        sourceId: String(post._id),
      });
    }

    let notificationCount = 0;
    let notificationWarning: string | undefined;
    if (!wasPublished && post.published) {
      try {
        const result = await notifyUsersAboutPublishedContent({
          kind: "blog",
          title: `New blog: ${post.title}`,
          message: post.excerpt || post.title,
          path: `/blog/${post.slug}`,
        });
        notificationCount = result.notified;
      } catch (error) {
        console.error("Failed to create notifications for the published blog", error);
        notificationWarning =
          "The blog was published, but in-app notifications could not be saved.";
      }
    }

    return NextResponse.json({
      success: true,
      post,
      notificationCount,
      notificationWarning,
    });
  } catch (error) {
    console.error("Could not update blog post", error);
    return NextResponse.json(
      { success: false, message: "Could not update blog post" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await isAdmin()))
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 },
      );

    const { id } = await request.json();
    if (!id)
      return NextResponse.json(
        { success: false, message: "Blog post id is required" },
        { status: 400 },
      );

    await connectDB();
    const post = await BlogPost.findByIdAndDelete(id);
    if (!post)
      return NextResponse.json(
        { success: false, message: "Blog post not found" },
        { status: 404 },
      );

    await CommunityPost.deleteOne({
      sourceType: "blog",
      sourceId: String(post._id),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not delete blog post", error);
    return NextResponse.json(
      { success: false, message: "Could not delete blog post" },
      { status: 500 },
    );
  }
}

export async function POST(r: Request) {
  try {
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
    const user = await getCurrentUser();
    const b = await r.json();
    if (!String(b.category || "").trim())
      return NextResponse.json(
        {
          success: false,
          message: "Select a blog category before publishing.",
        },
        { status: 400 },
      );
    await connectDB();
    const base = slugify(String(b.title || "post"));
    let slug = base;
    let i = 1;
    while (
      await BlogPost.exists({
        slug,
      })
    ) {
      slug = `${base}-${i++}`;
    }
    const post = await BlogPost.create({
      title: b.title,
      slug,
      excerpt: b.excerpt || "",
      content: b.content || "",
      coverImage: b.coverImage || "",
      category: String(b.category).trim(),
      published: b.published !== false,
      authorId: user?._id,
    });
    if (post.published && user) {
      await syncPublishedContentPost({
        sourceType: "blog",
        sourceId: String(post._id),
        userId: user._id,
        title: post.title,
        summary: post.excerpt || post.title,
        url: `/blog/${post.slug}`,
        imageUrl: post.coverImage,
        published: true,
      });
    }
    let notificationWarning: string | undefined;
    let notificationCount = 0;
    if (post.published) {
      try {
        const notificationResult = await notifyUsersAboutPublishedContent({
          kind: "blog",
          title: `New blog: ${post.title}`,
          message: post.excerpt || post.title,
          path: `/blog/${post.slug}`,
        });
        notificationCount = notificationResult.notified;
      } catch (error) {
        console.error("Failed to create notifications for the new blog post", error);
        notificationWarning =
          "The blog post was published, but in-app notifications could not be saved.";
      }
    }
    return NextResponse.json(
      {
        success: true,
        post,
        notificationCount,
        notificationWarning,
      },
      {
        status: 201,
      },
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        message: e?.message || "Failed to create post",
      },
      {
        status: 500,
      },
    );
  }
}
