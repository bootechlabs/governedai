import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { canManageApiKeys } from "@/lib/permissions";

const codeClass =
  "mt-2 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/60";

// Readable by any signed-in user (the /systems layout already redirects
// anonymous visitors to sign-in) — an integrator handed a key needs the docs
// but isn't necessarily an admin. Only *managing* keys stays admin-only.
export default async function ApiDocsPage() {
  const actor = await getCurrentUser();
  const canManageKeys = canManageApiKeys(actor.role);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 text-sm">
      {canManageKeys ? (
        <Link href="/systems/api-keys" className="text-sm text-zinc-500 hover:underline">
          ← API keys
        </Link>
      ) : (
        <Link href="/systems" className="text-sm text-zinc-500 hover:underline">
          ← Dashboard
        </Link>
      )}

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">API docs</h1>
      <p className="mt-1 text-zinc-500">
        Every request needs an <code>Authorization: Bearer &lt;key&gt;</code> header, using a key
        issued from the{" "}
        {canManageKeys ? (
          <Link href="/systems/api-keys" className="underline hover:no-underline">
            API keys
          </Link>
        ) : (
          "API keys"
        )}{" "}
        page{canManageKeys ? "" : " (ask an admin for one)"}. A key is scoped to your organization
        — you&apos;ll only ever see or create systems within it.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <Link
          href="/systems/api-keys/docs/reference"
          className="font-medium underline hover:no-underline"
        >
          Interactive reference (OpenAPI)
        </Link>
        <a
          href="/systems/api-keys/docs/openapi.json"
          download="governedai-openapi.json"
          className="text-zinc-500 underline hover:no-underline"
        >
          Download openapi.json
        </a>
        <span className="text-zinc-500">Browse every endpoint and try requests with your key.</span>
      </div>

      <h2 className="mt-6 font-medium">List AI systems</h2>
      <p className="mt-1 text-zinc-500">
        <code>GET /api/v1/ai-systems</code> — returns active systems by default; pass{" "}
        <code>?archived=1</code> for archived ones instead.
      </p>
      <pre className={codeClass}>
{`curl https://app.governedai.co/api/v1/ai-systems \\
  -H "Authorization: Bearer gai_..."`}
      </pre>

      <h2 className="mt-6 font-medium">Get one AI system</h2>
      <p className="mt-1 text-zinc-500"><code>GET /api/v1/ai-systems/:id</code></p>
      <pre className={codeClass}>
{`curl https://app.governedai.co/api/v1/ai-systems/abc123 \\
  -H "Authorization: Bearer gai_..."`}
      </pre>

      <h2 className="mt-6 font-medium">Register an AI system</h2>
      <p className="mt-1 text-zinc-500">
        <code>POST /api/v1/ai-systems</code> — only <code>name</code> is required. Same defaults
        as the UI: gets the standard Intake → Risk Review workflow stages, and is attributed to
        the API key in the audit log.
      </p>
      <pre className={codeClass}>
{`curl https://app.governedai.co/api/v1/ai-systems \\
  -H "Authorization: Bearer gai_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Claims Triage Assistant",
    "description": "Ambient scribe for claims review",
    "businessUnit": "Claims Ops",
    "vendorName": "Acme AI Inc",
    "classification": "CONFIDENTIAL",
    "deploymentStatus": "PILOT"
  }'`}
      </pre>
      <p className="mt-2 text-zinc-500">
        <code>classification</code>: PUBLIC, INTERNAL (default), CONFIDENTIAL, RESTRICTED.{" "}
        <code>deploymentStatus</code>: PLANNED (default), PILOT, PRODUCTION, RETIRED.{" "}
        <code>statesDeployed</code>: an array of 2-letter US state codes (or a comma-separated
        string), e.g. <code>[&quot;AL&quot;, &quot;GA&quot;]</code> — drives which state-specific
        regulations show as triggered. <code>isAgentic</code>: <code>true</code> or{" "}
        <code>false</code> (default) — set it for systems that take autonomous multi-step
        actions; it adds the agentic-governance questions to the risk assessment.
      </p>

      <h2 className="mt-6 font-medium">Update an AI system</h2>
      <p className="mt-1 text-zinc-500">
        <code>PUT /api/v1/ai-systems/:id</code> — full replace, same fields and defaults as
        registering one, so any optional field you omit (including <code>statesDeployed</code>{" "}
        and <code>isAgentic</code>) resets to its default. A change to <code>vendorName</code>, <code>classification</code>,{" "}
        <code>deploymentStatus</code>, <code>businessUnit</code>, <code>statesDeployed</code>, or{" "}
        <code>isAgentic</code> is
        logged and can trigger recertification, same as editing it in the UI.
      </p>
      <pre className={codeClass}>
{`curl -X PUT https://app.governedai.co/api/v1/ai-systems/abc123 \\
  -H "Authorization: Bearer gai_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Claims Triage Assistant",
    "classification": "RESTRICTED",
    "deploymentStatus": "PRODUCTION"
  }'`}
      </pre>
      <p className="mt-2 text-zinc-500">
        <code>409</code> if the system is archived — unarchive it in the UI first.
      </p>

      <h2 className="mt-6 font-medium">Archive an AI system</h2>
      <p className="mt-1 text-zinc-500">
        <code>DELETE /api/v1/ai-systems/:id</code> — archives the system; it isn&apos;t removed.
        Workflow, evidence, and audit history stay intact and reviewable, same as archiving from
        the UI. There is no endpoint for a permanent delete.
      </p>
      <pre className={codeClass}>
{`curl -X DELETE https://app.governedai.co/api/v1/ai-systems/abc123 \\
  -H "Authorization: Bearer gai_..."`}
      </pre>

      <h2 className="mt-6 font-medium">Errors</h2>
      <p className="mt-1 text-zinc-500">
        <code>401</code> for a missing/invalid/revoked key, <code>400</code> for a validation
        error (e.g. missing name, invalid classification), <code>404</code> for an id that
        doesn&apos;t exist or belongs to another organization, <code>409</code> for an update to
        an archived system. Every error body is <code>{"{ \"error\": \"...\" }"}</code>.
      </p>
    </div>
  );
}
