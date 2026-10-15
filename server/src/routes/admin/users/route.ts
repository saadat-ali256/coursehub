/* AUTO-FORMATTED FOR READABILITY */
/* API route: handles HTTP requests for this feature and returns the client response. */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, hasAdminPermission, isAdmin } from "@/lib/auth";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
export async function GET() {
  const actor = await getCurrentUser();
  if (!actor || (actor.role !== "admin" && !hasAdminPermission(actor, "manage_users")))
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
  const users = await User.find()
    .select("-password")
    .sort({
      _id: -1,
    })
    .lean();
  const counts = await Subscription.aggregate([
    {
      $group: {
        _id: "$userId",
        count: {
          $sum: 1,
        },
      },
    },
  ]);
  const map = new Map(counts.map((x) => [String(x._id), x.count]));
  return NextResponse.json({
    success: true,
    currentUserRole: actor.role,
    users: users.map((u) => ({
      ...u,
      subscriptionCount: map.get(String(u._id)) || 0,
    })),
  });
}
export async function DELETE(request: Request) {
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
  try {
    const { id } = await request.json();
    await connectDB();
    const me = await (await import("@/lib/auth")).getCurrentUser();
    if (me && String(me._id) === String(id))
      return NextResponse.json(
        {
          success: false,
          message: "You cannot remove your own admin account",
        },
        {
          status: 400,
        },
      );
    const target = await User.findById(id).select("role");
    if (!target)
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    if (target.role === "admin")
      return NextResponse.json(
        { success: false, message: "Administrator accounts cannot be removed here" },
        { status: 403 },
      );
    await User.findByIdAndDelete(id);
    await Subscription.deleteMany({
      userId: id,
    });
    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to remove user",
      },
      {
        status: 500,
      },
    );
  }
}
export async function PATCH(req: Request) {
  const actor = await getCurrentUser();
  if (!actor)
    return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 });
  const rootAdmin = actor.role === "admin";
  if (!rootAdmin && !hasAdminPermission(actor, "manage_users"))
    return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 });
  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id)
      return NextResponse.json({ success: false, message: "User id required" }, { status: 400 });
    await connectDB();
    const target = await User.findById(id);
    if (!target)
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    if (target.role === "admin")
      return NextResponse.json({ success: false, message: "Administrator accounts cannot be changed here" }, { status: 403 });
    if (!rootAdmin && (body.role !== undefined || body.adminPermissions !== undefined))
      return NextResponse.json({ success: false, message: "Only an administrator can create sub-admins or assign permissions" }, { status: 403 });
    const updates: Record<string, unknown> = {};
    if (body.status !== undefined) {
      if (!["active", "suspended"].includes(body.status))
        return NextResponse.json({ success: false, message: "Invalid account status" }, { status: 400 });
      updates.status = body.status;
    }
    if (rootAdmin && body.role !== undefined) {
      if (!["user", "subadmin"].includes(body.role))
        return NextResponse.json({ success: false, message: "Role must be user or subadmin" }, { status: 400 });
      updates.role = body.role;
      if (body.role === "user") updates.adminPermissions = [];
    }
    if (rootAdmin && body.adminPermissions !== undefined) {
      const allowed = ["manage_community", "moderate_feed", "manage_users"];
      if (
        !Array.isArray(body.adminPermissions) ||
        body.adminPermissions.some((permission: unknown) => !allowed.includes(String(permission)))
      )
        return NextResponse.json({ success: false, message: "Invalid sub-admin permissions" }, { status: 400 });
      updates.adminPermissions = [...new Set(body.adminPermissions)];
    }
    target.set(updates);
    await target.save();
    const safeUser = target.toObject();
    delete safeUser.password;
    return NextResponse.json({ success: true, user: safeUser });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to update user" }, { status: 500 });
  }
}
