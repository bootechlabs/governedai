import { NextResponse } from "next/server";
import { getCurrentUserOrNull } from "@/lib/current-user";
import { buildOpenApiSpec } from "@/lib/openapi";
import { getRequestOrigin } from "@/lib/request-origin";

// The spec for import into Postman / codegen tools. Route handlers don't
// run /systems/layout.tsx, so the session is checked here (proxy.ts only
// checks that a session cookie exists, not that it's valid). Session-only:
// an API key can't fetch this — it documents the API, it isn't part of it.
export async function GET(request: Request) {
  const user = await getCurrentUserOrNull();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  return NextResponse.json(buildOpenApiSpec(getRequestOrigin(request.headers)), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
