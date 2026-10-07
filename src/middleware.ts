import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (!token && (path === "/" || path.startsWith("/characters") || path.startsWith("/parties") || path.startsWith("/compendium"))) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Admin Routes
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // GM Routes (accessible by GM and ADMIN)
    if (path.startsWith("/gm") && token?.role !== "GM" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  },
  {
    pages: { signIn: "/login" },
    callbacks: {
      authorized: ({ token }) => Boolean(token?.id && token.role && !token.invalid && typeof token.sessionVersion === "number"),
    },
  }
);

export const config = {
  matcher: ["/", "/admin/:path*", "/gm/:path*", "/characters/:path*", "/parties/:path*", "/compendium/:path*"],
};
