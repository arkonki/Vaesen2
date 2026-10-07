import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export default async function middleware(req: NextRequest) {
  // A reverse proxy can expose localhost as req.nextUrl.origin. Never redirect to it
  // when the deployment has a configured public URL, or trust forwarded host input.
  const origin = new URL(process.env.NEXTAUTH_URL || req.url).origin;
  const redirect = (path: string) => NextResponse.redirect(new URL(path, origin));
  if (!process.env.NEXTAUTH_SECRET) {
    return redirect("/api/auth/error?error=Configuration");
  }
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const authorized = Boolean(
    token && typeof token.id === "string" && token.id &&
    ["PLAYER", "GM", "ADMIN"].includes(String(token.role)) && !token.invalid &&
    typeof token.sessionVersion === "number" && Number.isInteger(token.sessionVersion) && token.sessionVersion >= 0,
  );
  const path = req.nextUrl.pathname;

  if (!authorized) {
    const login = new URL("/login", origin);
    login.searchParams.set("callbackUrl", path + req.nextUrl.search);
    return NextResponse.redirect(login);
  }

  if (path.startsWith("/admin") && token?.role !== "ADMIN") return redirect("/");
  if (path.startsWith("/gm") && !["GM", "ADMIN"].includes(String(token?.role))) return redirect("/");

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*", "/gm/:path*", "/characters/:path*", "/parties/:path*", "/compendium/:path*"],
};
