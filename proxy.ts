import { NextResponse, type NextRequest } from "next/server";

// Cheap cookie-presence check so unauthenticated visitors are bounced before
// rendering. Real validation happens in requireAdmin() on every page/action.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("hd_session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/((?!login).*)"],
};
