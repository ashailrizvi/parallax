import { NextResponse, type NextRequest } from "next/server";
import { personalStudio } from "@/config/studio-mode";

export function proxy(request: NextRequest) {
  if (!personalStudio) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: { code: "not_found", message: "This feature is disabled in personal mode." } },
      { status: 404 },
    );
  }
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: [
    "/pricing", "/enterprise", "/wallet", "/invite", "/developer", "/mcp",
    "/api/billing/:path*", "/api/wallet/:path*", "/api/account/referral/:path*",
    "/api/developer/:path*", "/api/v1/:path*", "/api/mcp/:path*",
  ],
};
