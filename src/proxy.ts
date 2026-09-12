import { NextRequest, NextResponse } from "next/server";

// Cheap, edge-runtime check: cookie presence only, not real verification —
// the Stytch Node SDK needs the Node runtime, not Edge, so it can't run
// here. The actual session verification (and graceful redirect on an
// invalid/expired session) happens in src/app/systems/layout.tsx via
// getCurrentUserOrNull(). This proxy just keeps obviously-unauthenticated
// requests from reaching the page at all.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("governedai_session");
  if (!hasSession) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/systems/:path*"],
};
