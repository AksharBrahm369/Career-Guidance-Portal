import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/edge";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // /admin/login is public; every other /admin/* requires an admin session.
  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const role = (req.auth?.user as { role?: string } | undefined)?.role;
    if (!req.auth || role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
