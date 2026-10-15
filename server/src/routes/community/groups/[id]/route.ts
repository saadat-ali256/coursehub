/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, hasAdminPermission } from "@/lib/auth";
import CommunityGroup from "@/models/CommunityGroup";
import User from "@/models/User";
import mongoose from "mongoose";
export async function PATCH(
  r: Request,
  c: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const actor = await getCurrentUser();
  if (!hasAdminPermission(actor, "manage_community"))
    return NextResponse.json(
      {
        success: false,
        message: "Admin access required",
      },
      {
        status: 403,
      },
    );
  try {
    const { id } = await c.params;
    const b = await r.json();
    await connectDB();
    const updates: Record<string, unknown> = {};
    for (const key of ["name", "description", "avatarUrl", "audience"]) {
      if (b[key] !== undefined) updates[key] = b[key];
    }
    if (b.active !== undefined) updates.active = b.active !== false;
    if (b.memberAccessRestricted !== undefined) {
      if (typeof b.memberAccessRestricted !== "boolean")
        return NextResponse.json({ success: false, message: "Invalid member access setting" }, { status: 400 });
      updates.memberAccessRestricted = b.memberAccessRestricted;
    }
    if (b.memberIds !== undefined) {
      if (
        !Array.isArray(b.memberIds) ||
        b.memberIds.some((memberId: unknown) => !mongoose.Types.ObjectId.isValid(String(memberId)))
      )
        return NextResponse.json({ success: false, message: "Invalid group member list" }, { status: 400 });
      const memberIds = [...new Set(b.memberIds.map(String))];
      const validCount = await User.countDocuments({ _id: { $in: memberIds } });
      if (validCount !== memberIds.length)
        return NextResponse.json({ success: false, message: "One or more group members do not exist" }, { status: 400 });
      updates.memberIds = memberIds;
    }
    const group = await CommunityGroup.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,
      },
    );
    return NextResponse.json({
      success: true,
      group,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update group",
      },
      {
        status: 500,
      },
    );
  }
}
export async function DELETE(
  _r: Request,
  c: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  if (!(await hasManageCommunity()))
    return NextResponse.json(
      {
        success: false,
        message: "Admin access required",
      },
      {
        status: 403,
      },
    );
  try {
    const { id } = await c.params;
    await connectDB();
    await CommunityGroup.findByIdAndDelete(id);
    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete group",
      },
      {
        status: 500,
      },
    );
  }
}

async function hasManageCommunity() {
  return hasAdminPermission(await getCurrentUser(), "manage_community");
}
