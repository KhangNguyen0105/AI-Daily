import { auth } from "@/src/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Allow access to the login page
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Protect /admin/* pages
  if (pathname.startsWith("/admin") && !isLoggedIn) {
    const loginUrl = new URL("/admin/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Protect /api/admin/* routes
  if (pathname.startsWith("/api/admin") && !isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
