/* AUTO-FORMATTED FOR READABILITY */
/* Shared helper: contains reusable application or infrastructure logic. */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
export async function requireUser() {
  const u = await getCurrentUser();
  if (!u)
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        {
          status: 401,
        },
      ),
    };
  return {
    user: u,
    response: null,
  };
}
export async function requireAdmin() {
  const { user, response } = await requireUser();
  if (response)
    return {
      user: null,
      response,
    };
  if (user?.role !== "admin")
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          message: "Admin access required",
        },
        {
          status: 403,
        },
      ),
    };
  return {
    user,
    response: null,
  };
}
