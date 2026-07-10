import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Define public paths that don't require authentication
  const isPublicPath = 
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg)$/);
    
  const hasSession = request.cookies.has("notion_session");
  
  // If no session and trying to access a protected page, redirect to login
  if (!hasSession && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // If session exists and trying to access login, redirect to home
  if (hasSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except public assets
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (some api endpoints might be public, handled inside middleware)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
