import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password", "/reset-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith("/_next") || pathname.startsWith("/api")
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get("senti_access_token")?.value;

  if (!token) {
    const hasLocalStorageToken = request.headers.get("cookie")?.includes("senti_access_token");
    if (!hasLocalStorageToken) {
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
