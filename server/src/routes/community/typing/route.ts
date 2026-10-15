import { NextResponse } from "next/server";
import { getCurrentUser, hasAdminPermission } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import CommunityGroup from "@/models/CommunityGroup";
import { hasCommunityAccess } from "@/lib/community-access";

const activeTypers = new Map<string, Map<string, { name: string; expiresAt: number }>>();

async function canAccess(user: any, group: any) {
  if (!group) return false;
  if (hasAdminPermission(user, "manage_community")) return true;
  if (!group.active) return false;
  if (group.memberIds?.some((memberId: unknown) => String(memberId) === String(user._id)))
    return true;
  if (group.memberAccessRestricted || group.memberIds?.length) return false;
  return hasCommunityAccess(user);
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json(
        { success: false, message: "Login required" },
        { status: 401 },
      );
    const groupId = new URL(request.url).searchParams.get("groupId");
    if (!groupId)
      return NextResponse.json(
        { success: false, message: "groupId required" },
        { status: 400 },
      );
    await connectDB();
    const group = await CommunityGroup.findById(groupId);
    if (!group || !(await canAccess(user, group)))
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 },
      );
    const now = Date.now();
    const typers = activeTypers.get(groupId);
    const users: string[] = [];
    if (typers) {
      for (const [userId, entry] of typers) {
        if (entry.expiresAt <= now) typers.delete(userId);
        else if (userId !== String(user._id)) users.push(entry.name);
      }
      if (!typers.size) activeTypers.delete(groupId);
    }
    return NextResponse.json({ success: true, users });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to check typing status" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json(
        { success: false, message: "Login required" },
        { status: 401 },
      );
    const { groupId, typing } = await request.json();
    if (!groupId || typeof typing !== "boolean")
      return NextResponse.json(
        { success: false, message: "groupId and typing status required" },
        { status: 400 },
      );
    await connectDB();
    const group = await CommunityGroup.findById(groupId);
    if (!group || !(await canAccess(user, group)))
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 },
      );
    let typers = activeTypers.get(String(groupId));
    if (!typers) {
      typers = new Map();
      activeTypers.set(String(groupId), typers);
    }
    const userId = String(user._id);
    if (typing)
      typers.set(userId, {
        name: user.name || "Someone",
        expiresAt: Date.now() + 5000,
      });
    else typers.delete(userId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to update typing status" },
      { status: 500 },
    );
  }
}
