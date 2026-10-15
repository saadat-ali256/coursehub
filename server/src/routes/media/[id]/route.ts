/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import Media from "@/models/Media";
import HeroSlide from "@/models/HeroSlide";
import Lesson from "@/models/Lesson";
import { hasCourseAccess } from "@/lib/subscription-access";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import path from "path";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    await connectDB();
    const { id } = await params;
    const media = await Media.findById(id).lean();
    if (!media)
      return NextResponse.json(
        {
          success: false,
          message: "Media not found",
        },
        {
          status: 404,
        },
      );
    const user = await getCurrentUser();
    const isPublicHeroImage =
      media.kind === "image" &&
      !media.private &&
      Boolean(
        await HeroSlide.exists({
          active: true,
          imageUrl: `/api/media/${id}`,
        }),
      );
    if (!user && !isPublicHeroImage)
      return NextResponse.json(
        {
          success: false,
          message: "Login required",
        },
        {
          status: 401,
        },
      );
    if (media.private) {
      if (user.role !== "admin") {
        const lesson = await Lesson.findOne({
          videoUrl: `/api/media/${id}`,
        }).lean();
        if (!lesson)
          return NextResponse.json(
            {
              success: false,
              message: "Media access denied",
            },
            {
              status: 403,
            },
          );
        if (!(await hasCourseAccess(user, String(lesson.courseId))))
          return NextResponse.json(
            {
              success: false,
              message: "Subscribe to access this premium lesson.",
            },
            {
              status: 403,
            },
          );
      }
    }
    const range = req.headers.get("range");
    const isLegacyLocalMedia = media.storageKey
      .replace(/\\/g, "/")
      .startsWith("private_uploads/");
    const useS3 =
      !!process.env.S3_BUCKET &&
      media.storageProvider !== "local" &&
      !isLegacyLocalMedia;
    const s3 = useS3
      ? new S3Client({
          region: process.env.S3_REGION || "us-east-1",
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
          },
        })
      : null;
    if (s3) {
      const obj = await s3.send(
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: media.storageKey,
        }),
      );
      const headers = new Headers({
        "Content-Type": media.mimeType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
      });
      if (obj.ContentLength)
        headers.set("Content-Length", String(obj.ContentLength));
      return new Response(obj.Body as any, {
        status: 200,
        headers,
      });
    }
    const storagePath = path.resolve(process.cwd(), media.storageKey);
    const st = await stat(storagePath);
    const headers = new Headers({
      "Content-Type": media.mimeType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "Content-Length": String(st.size),
    });
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      if (m) {
        const start = m[1] ? Number(m[1]) : 0;
        const end = m[2] ? Number(m[2]) : st.size - 1;
        if (start <= end && start < st.size) {
          headers.set("Content-Range", `bytes ${start}-${end}/${st.size}`);
          headers.set("Content-Length", String(end - start + 1));
          return new Response(
            Readable.toWeb(
              createReadStream(storagePath, {
                start,
                end,
              }),
            ) as any,
            {
              status: 206,
              headers,
            },
          );
        }
      }
    }
    return new Response(
      Readable.toWeb(createReadStream(storagePath)) as any,
      {
        status: 200,
        headers,
      },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        success: false,
        message: "Media unavailable",
      },
      {
        status: 404,
      },
    );
  }
}
