import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { canManageApiKeys } from "@/lib/permissions";

const codeClass =
  "mt-2 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/60";

export default async function ApiDocsPage() {
  const actor = await getCurrentUser();
  if (!canManageApiKeys(actor.role)) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 text-sm">
      <Link href="/systems/api-keys" className="text-sm text-zinc-500 hover:underline">
        ← API keys
      </Link>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">API docs</h1>
      <p className="mt-1 text-zinc-500">
        Every request needs an <code>Authorization: Bearer &lt;key&gt;</code> header, using a key
        from the{" "}
        <Link href="/systems/api-keys" className="underline hover:no-underline">
          API keys
        </Link>{" "}
        page. A key is scoped to your organization — you&apos;ll only ever see or create systems
        within it.
      </p>

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
        regulations show as triggered.
      </p>

      <h2 className="mt-6 font-medium">Update an AI system</h2>
      <p className="mt-1 text-zinc-500">
        <code>PUT /api/v1/ai-systems/:id</code> — full replace, same fields and defaults as
        registering one. A change to <code>vendorName</code>, <code>classification</code>,{" "}
        <code>deploymentStatus</code>, <code>businessUnit</code>, or <code>statesDeployed</code> is
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
