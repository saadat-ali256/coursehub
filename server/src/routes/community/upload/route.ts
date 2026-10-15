/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { getCurrentUser, hasAdminPermission } from "@/lib/auth";
import { hasCommunityAccess } from "@/lib/community-access";
import CommunityGroup from "@/models/CommunityGroup";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
export const runtime = "nodejs";
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
  const fd = await req.formData();
  const f = fd.get("file");
  const kind = String(fd.get("kind") || "post");
  if (!["post", "avatar", "banner", "group", "blog", "chat"].includes(kind))
    return NextResponse.json(
      { success: false, message: "Invalid image type." },
      { status: 400 },
    );
  if (["post", "avatar", "banner"].includes(kind) && !(await hasCommunityAccess(u)))
    return NextResponse.json(
      {
        success: false,
        message: "A subscription is required to upload community and profile images.",
      },
      { status: 403 },
    );
  if (kind === "chat") {
    const groupId = String(fd.get("groupId") || "");
    const group = groupId ? await CommunityGroup.findById(groupId).select("active memberIds") : null;
    const moderator = hasAdminPermission(u, "manage_community");
    const explicitlyMember = group?.memberIds?.some(
      (memberId: unknown) => String(memberId) === String(u._id),
    );
    const accessBySubscription =
      !!group &&
      !group.memberAccessRestricted &&
      !group.memberIds?.length &&
      (await hasCommunityAccess(u));
    if (
      !group ||
      (!group.active && !moderator) ||
      (!moderator && !explicitlyMember && !accessBySubscription)
    )
      return NextResponse.json(
        { success: false, message: "You do not have access to upload images in this group." },
        { status: 403 },
      );
  }
  if (kind === "group" && !hasAdminPermission(u, "manage_community"))
    return NextResponse.json(
      {
        success: false,
        message: "Admin access required to upload group photos",
      },
      {
        status: 403,
      },
    );
  if (kind === "blog" && u.role !== "admin")
    return NextResponse.json(
      {
        success: false,
        message: "Admin access required to upload blog covers",
      },
      {
        status: 403,
      },
    );
  if (!(f instanceof File) || !f.type.startsWith("image/"))
    return NextResponse.json(
      {
        success: false,
        message: "Image required",
      },
      {
        status: 400,
      },
    );
  if (f.size > 10 * 1024 * 1024)
    return NextResponse.json(
      {
        success: false,
        message: "Max 10MB",
      },
      {
        status: 413,
      },
    );
  const folder =
    kind === "avatar"
      ? "avatars"
      : kind === "banner"
        ? "banners"
        : kind === "group"
          ? "groups"
          : kind === "blog"
            ? "blog"
            : "community";
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, {
    recursive: true,
  });
  const fileBuffer = Buffer.from(await f.arrayBuffer());
  let imageBuffer = fileBuffer;
  let ext = path.extname(f.name) || ".jpg";
  if (kind === "avatar") {
    try {
      imageBuffer = await sharp(fileBuffer)
        .rotate()
        .resize({
          width: 1024,
          height: 1024,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 88 })
        .toBuffer();
    } catch (error) {
      if (
        error instanceof Error &&
        /unsupported image format/i.test(error.message)
      )
        return NextResponse.json(
          {
            success: false,
            message: "This image format is not supported. Choose a JPEG, PNG, WebP, or HEIC image.",
          },
          { status: 415 },
        );
      throw error;
    }
    ext = ".jpg";
  }
  const name = `${Date.now()}-${crypto.randomBytes(5).toString("hex")}${ext}`;
  await writeFile(path.join(dir, name), imageBuffer);
  return NextResponse.json({
    success: true,
    url: `/uploads/${folder}/${name}`,
  });
}
