import { NextResponse, type NextRequest } from "next/server";

// Quick check only: no session cookie → go to login. Every page and action
// still verifies the session against the database (see lib/auth.ts).
export function proxy(request: NextRequest) {
  if (!request.cookies.has("crm_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|_next/|manifest.webmanifest|icon|apple-icon|favicon|logo-mark).*)"],
};
