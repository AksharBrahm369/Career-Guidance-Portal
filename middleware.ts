import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate: redirect unauthenticated users to the right login. The
// authoritative role check runs in the guards (requireAdmin / requireStudent)
// and the admin layout, which execute per route/page.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Expose the path to server layouts/pages (so the admin layout can exempt
  // its own login route from the admin-role gate).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const pass = () => NextResponse.next({ request: { headers: requestHeaders } });

  // Public auth routes render bare (no session-cookie gate). They still flow
  // through `pass()` so x-pathname is set for layouts to detect them.
  if (
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/student/login") ||
    pathname.startsWith("/student/signup")
  ) {
    return pass();
  }

  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token") ??
    request.cookies.get("better-auth-session_token") ??
    request.cookies.get("__Secure-better-auth-session_token");
  if (!sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/admin") ? "/admin/login" : "/student/login";
    return NextResponse.redirect(url);
  }
  return pass();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/assessment",
    "/assessment/:path*",
    // /student/:path* is matched only so x-pathname is set for the (student)
    // layout to render /student/login + /student/signup bare (both are exempt
    // from the session gate above). /courses stays PUBLIC — intentionally not
    // matched — so the catalogue is browsable without login.
    "/student/:path*",
  ],
};
