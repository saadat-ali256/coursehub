import { getCurrentClerkUser } from "@/lib/clerk";
import { getRequestContext } from "@/request-context";

/** Resolve the CourseHub profile from a verified Clerk session. */
export async function getCurrentUser() {
  const request = getRequestContext();
  if (!request) return null;
  return getCurrentClerkUser(request);
}

/** Check whether the current request belongs to an admin. */
export async function isAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

export type AdminPermission =
  | "manage_community"
  | "moderate_feed"
  | "manage_users";

export function hasAdminPermission(
  user: { role?: string; adminPermissions?: string[] } | null | undefined,
  permission: AdminPermission,
) {
  return (
    user?.role === "admin" ||
    (user?.role === "subadmin" &&
      Array.isArray(user.adminPermissions) &&
      user.adminPermissions.includes(permission))
  );
}
