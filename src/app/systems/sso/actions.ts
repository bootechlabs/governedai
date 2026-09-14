"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";
import { canManageSso } from "@/lib/permissions";
import { stytchClient } from "@/lib/stytch";

async function requireAdmin() {
  const actor = await getCurrentUser();
  if (!canManageSso(actor.role)) {
    throw new Error("Only admins can manage SSO connections");
  }
  return actor;
}

// Stytch maps IdP assertion/claim attributes to Stytch fields via this
// object (key = Stytch field, value = the attribute name the IdP sends).
// "email" and "name" are what most IdPs send by default for a generic
// SAML/OIDC app — admins with a nonstandard IdP can override the JSON.
const DEFAULT_ATTRIBUTE_MAPPING = { email: "email", full_name: "name" };

function parseAttributeMapping(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_ATTRIBUTE_MAPPING;
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error("Attribute mapping must be valid JSON");
  }
}

export async function createSamlConnection(formData: FormData) {
  const actor = await requireAdmin();
  const displayName = String(formData.get("displayName") ?? "").trim() || undefined;
  const identityProvider = String(formData.get("identityProvider") ?? "generic");

  await stytchClient.sso.saml.createConnection({
    organization_id: actor.organizationId,
    display_name: displayName,
    identity_provider: identityProvider,
  });

  revalidatePath("/systems/sso");
}

// A connection only goes "active" once all of idp_sso_url, idp_entity_id,
// x509_certificate, and attribute_mapping are set — see Stytch's
// updateConnection docs. Until then it sits at "pending" and can't be
// used to sign in.
export async function updateSamlConnection(connectionId: string, formData: FormData) {
  const actor = await requireAdmin();
  const idpEntityId = String(formData.get("idpEntityId") ?? "").trim();
  const idpSsoUrl = String(formData.get("idpSsoUrl") ?? "").trim();
  const x509Certificate = String(formData.get("x509Certificate") ?? "").trim();
  const attributeMapping = parseAttributeMapping(String(formData.get("attributeMapping") ?? ""));

  if (!idpEntityId || !idpSsoUrl || !x509Certificate) {
    throw new Error(
      "Entity ID, SSO URL, and certificate are all required to activate the connection",
    );
  }

  await stytchClient.sso.saml.updateConnection({
    organization_id: actor.organizationId,
    connection_id: connectionId,
    idp_entity_id: idpEntityId,
    idp_sso_url: idpSsoUrl,
    x509_certificate: x509Certificate,
    attribute_mapping: attributeMapping,
  });

  revalidatePath("/systems/sso");
}

export async function createOidcConnection(formData: FormData) {
  const actor = await requireAdmin();
  const displayName = String(formData.get("displayName") ?? "").trim() || undefined;
  const identityProvider = String(formData.get("identityProvider") ?? "generic");

  await stytchClient.sso.oidc.createConnection({
    organization_id: actor.organizationId,
    display_name: displayName,
    identity_provider: identityProvider,
  });

  revalidatePath("/systems/sso");
}

// Active once issuer/client_id/client_secret/authorization_url/token_url/
// userinfo_url/jwks_url are all set — Stytch infers the four URL fields
// from the issuer's /.well-known/openid-configuration document, so we
// only need to collect the three values an IdP can't publish itself.
export async function updateOidcConnection(connectionId: string, formData: FormData) {
  const actor = await requireAdmin();
  const issuer = String(formData.get("issuer") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "").trim();
  const clientSecret = String(formData.get("clientSecret") ?? "").trim();

  if (!issuer || !clientId || !clientSecret) {
    throw new Error("Issuer, client ID, and client secret are all required to activate the connection");
  }

  await stytchClient.sso.oidc.updateConnection({
    organization_id: actor.organizationId,
    connection_id: connectionId,
    issuer,
    client_id: clientId,
    client_secret: clientSecret,
  });

  revalidatePath("/systems/sso");
}

export async function deleteSsoConnection(connectionId: string) {
  const actor = await requireAdmin();
  await stytchClient.sso.deleteConnection({
    organization_id: actor.organizationId,
    connection_id: connectionId,
  });
  revalidatePath("/systems/sso");
}
