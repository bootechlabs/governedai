import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { canManageSso } from "@/lib/permissions";
import { stytchClient } from "@/lib/stytch";
import { inputClass, primaryButtonClass } from "@/lib/ui";
import {
  createSamlConnection,
  updateSamlConnection,
  createOidcConnection,
  updateOidcConnection,
} from "./actions";
import { DeleteConnectionButton } from "./delete-connection-button";
import type { SAMLConnection, OIDCConnection } from "stytch";

export const dynamic = "force-dynamic";

const identityProviderOptions = [
  { value: "generic", label: "Generic / other" },
  { value: "okta", label: "Okta" },
  { value: "microsoft-entra", label: "Microsoft Entra ID" },
  { value: "google-workspace", label: "Google Workspace" },
  { value: "onelogin", label: "OneLogin" },
  { value: "jumpcloud", label: "JumpCloud" },
  { value: "pingfederate", label: "PingFederate" },
];

const fieldLabelClass = "text-xs font-medium text-zinc-500";
const readOnlyValueClass =
  "select-all rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-900/60";

export default async function SsoPage() {
  const actor = await getCurrentUser();
  if (!canManageSso(actor.role)) notFound();

  const { saml_connections, oidc_connections } = await stytchClient.sso.getConnections({
    organization_id: actor.organizationId,
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/systems" className="text-sm text-zinc-500 hover:underline">
        ← All systems
      </Link>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Single sign-on</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Configure a SAML or OIDC connection so your team can sign in with your identity
        provider instead of a magic link. A connection stays &quot;pending&quot; and can&apos;t be
        used to sign in until every field below is filled in.
      </p>

      {saml_connections.map((connection) => (
        <SamlConnectionCard key={connection.connection_id} connection={connection} />
      ))}
      {oidc_connections.map((connection) => (
        <OidcConnectionCard key={connection.connection_id} connection={connection} />
      ))}

      <h2 className="mt-10 text-lg font-medium">Add a connection</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <form
          action={createSamlConnection}
          className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <h3 className="text-sm font-medium">SAML</h3>
          <input name="displayName" placeholder="Display name (optional)" className={inputClass} />
          <select name="identityProvider" defaultValue="generic" className={inputClass}>
            {identityProviderOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button type="submit" className={`self-start ${primaryButtonClass}`}>
            Add SAML connection
          </button>
        </form>

        <form
          action={createOidcConnection}
          className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <h3 className="text-sm font-medium">OIDC</h3>
          <input name="displayName" placeholder="Display name (optional)" className={inputClass} />
          <select name="identityProvider" defaultValue="generic" className={inputClass}>
            {identityProviderOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button type="submit" className={`self-start ${primaryButtonClass}`}>
            Add OIDC connection
          </button>
        </form>
      </div>
    </div>
  );
}

function ConnectionStatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
        isActive
          ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-400"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400"
      }`}
    >
      {isActive ? "Active" : "Pending"}
    </span>
  );
}

function SamlConnectionCard({ connection }: { connection: SAMLConnection }) {
  const formId = `saml-${connection.connection_id}`;
  return (
    <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <span className="font-medium">{connection.display_name || "SAML connection"}</span>
        <div className="flex items-center gap-3">
          <ConnectionStatusBadge status={connection.status} />
          <DeleteConnectionButton
            connectionId={connection.connection_id}
            displayName={connection.display_name || "SAML connection"}
          />
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <div className={fieldLabelClass}>ACS URL — give this to your IdP</div>
          <div className={readOnlyValueClass}>{connection.acs_url}</div>
        </div>
        <div>
          <div className={fieldLabelClass}>Audience URI / SP Entity ID — give this to your IdP</div>
          <div className={readOnlyValueClass}>{connection.audience_uri}</div>
        </div>
      </div>

      <form id={formId} action={updateSamlConnection.bind(null, connection.connection_id)} />
      <div className="mt-3 flex flex-col gap-2">
        <label className={fieldLabelClass}>IdP Entity ID (from your IdP)</label>
        <input
          form={formId}
          name="idpEntityId"
          defaultValue={connection.idp_entity_id}
          className={inputClass}
        />
        <label className={fieldLabelClass}>IdP SSO URL (from your IdP)</label>
        <input
          form={formId}
          name="idpSsoUrl"
          defaultValue={connection.idp_sso_url}
          className={inputClass}
        />
        <label className={fieldLabelClass}>IdP signing certificate, PEM format (from your IdP)</label>
        <textarea
          form={formId}
          name="x509Certificate"
          rows={4}
          placeholder="-----BEGIN CERTIFICATE-----"
          className={`${inputClass} font-mono text-xs`}
        />
        <label className={fieldLabelClass}>
          Attribute mapping (JSON — defaults to {"{"}&quot;email&quot;: &quot;email&quot;,
          &quot;full_name&quot;: &quot;name&quot;{"}"} if left blank)
        </label>
        <textarea
          form={formId}
          name="attributeMapping"
          rows={2}
          placeholder='{"email": "email", "full_name": "name"}'
          className={`${inputClass} font-mono text-xs`}
        />
        <button form={formId} type="submit" className={`self-start ${primaryButtonClass}`}>
          Save
        </button>
      </div>
    </div>
  );
}

function OidcConnectionCard({ connection }: { connection: OIDCConnection }) {
  const formId = `oidc-${connection.connection_id}`;
  return (
    <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <span className="font-medium">{connection.display_name || "OIDC connection"}</span>
        <div className="flex items-center gap-3">
          <ConnectionStatusBadge status={connection.status} />
          <DeleteConnectionButton
            connectionId={connection.connection_id}
            displayName={connection.display_name || "OIDC connection"}
          />
        </div>
      </div>

      <div className="mt-3">
        <div className={fieldLabelClass}>Redirect URL — give this to your IdP as the callback URL</div>
        <div className={readOnlyValueClass}>{connection.redirect_url}</div>
      </div>

      <form id={formId} action={updateOidcConnection.bind(null, connection.connection_id)} />
      <div className="mt-3 flex flex-col gap-2">
        <label className={fieldLabelClass}>Issuer URL (from your IdP)</label>
        <input
          form={formId}
          name="issuer"
          defaultValue={connection.issuer}
          placeholder="https://your-idp.example.com"
          className={inputClass}
        />
        <label className={fieldLabelClass}>Client ID (from your IdP)</label>
        <input
          form={formId}
          name="clientId"
          defaultValue={connection.client_id}
          className={inputClass}
        />
        <label className={fieldLabelClass}>Client secret (from your IdP)</label>
        <input form={formId} name="clientSecret" type="password" className={inputClass} />
        <button form={formId} type="submit" className={`self-start ${primaryButtonClass}`}>
          Save
        </button>
      </div>
    </div>
  );
}
