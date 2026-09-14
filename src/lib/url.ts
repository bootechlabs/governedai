// Local dev serves over http, everywhere else is https — used to build
// absolute callback/redirect URLs to hand to Stytch.
export function currentOrigin(host: string) {
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return `${isLocal ? "http" : "https"}://${host}`;
}
