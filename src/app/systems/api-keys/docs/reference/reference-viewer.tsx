"use client";

import dynamic from "next/dynamic";
// The React wrapper doesn't import its own stylesheet (it's a separate export).
import "@scalar/api-reference-react/style.css";

// Scalar is large — only ship it on this page, and only in the browser.
const ApiReferenceReact = dynamic(
  () => import("@scalar/api-reference-react").then((m) => m.ApiReferenceReact),
  { ssr: false, loading: () => <p className="p-6 text-sm text-zinc-500">Loading reference…</p> },
);

// Everything third-party is off on purpose: this page handles a real API key
// (typed into the "Test request" console), so no telemetry, no AI agent or MCP
// service, no external client links, no fonts from Scalar's CDN (the app's own
// self-hosted Geist fonts are used instead), and the key isn't persisted to
// localStorage. The viewer follows the OS light/dark preference by default.
const APP_FONTS_CSS = `
  :root {
    --scalar-font: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
    --scalar-font-code: var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace;
  }
`;

export function ReferenceViewer({ spec }: { spec: Record<string, unknown> }) {
  return (
    <ApiReferenceReact
      configuration={{
        content: spec,
        telemetry: false,
        persistAuth: false,
        agent: { disabled: true },
        mcp: { disabled: true },
        hideClientButton: true,
        showDeveloperTools: "never",
        withDefaultFonts: false,
        customCss: APP_FONTS_CSS,
      }}
    />
  );
}
