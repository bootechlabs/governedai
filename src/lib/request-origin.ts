// Public origin of the current request (e.g. https://app.governedai.co),
// for links/specs that must point back at whichever deployment served
// them — production, a Vercel preview, or local dev. x-forwarded-proto is
// set by Vercel; without it, assume https in production and http locally.
export function getRequestOrigin(requestHeaders: Headers): string {
  const host = requestHeaders.get("host");
  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}`;
}
