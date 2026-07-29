import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isDashboard = pathname.startsWith("/dashboard");
  const isLogin = pathname === "/login";

  if (isDashboard && !req.auth) {
    const homeUrl = new URL("/", req.nextUrl.origin);
    homeUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(homeUrl);
  }

  if (isLogin) {
    if (req.auth) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
    }
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
