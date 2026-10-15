/* Proxy: applies shared security headers and production origin checks. */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
export function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const h = res.headers;
  h.set("X-Content-Type-Options", "nosniff");
  h.set("X-Frame-Options", "SAMEORIGIN");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self)",
  );
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("X-DNS-Prefetch-Control", "off");
  if (process.env.NODE_ENV === "production")
    h.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
    req.nextUrl.pathname.startsWith("/api/") &&
    process.env.NODE_ENV === "production"
  ) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin) {
      try {
        if (new URL(origin).host !== host)
          return new NextResponse(
            JSON.stringify({
              success: false,
              message: "Origin not allowed",
            }),
            {
              status: 403,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
      } catch {
        return new NextResponse(
          JSON.stringify({
            success: false,
            message: "Invalid origin",
          }),
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }
    }
  }
  return res;
}

export default clerkMiddleware((_auth, req) => proxy(req));

export const config = {
  matcher: ["/:path*"],
};
