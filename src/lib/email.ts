import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Used only for the impersonation-started notice — Stytch remains the
// only channel for anything auth-related (magic links, invites). Failure
// to send is caught by the caller and never blocks the impersonation
// itself from working; support access matters more than the notice.
export async function sendImpersonationStartedEmail(params: {
  to: string;
  targetName: string;
  adminEmail: string;
  expiresAt: Date;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping impersonation notification email");
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "GovernedAI <notifications@governedai.co>",
    to: params.to,
    subject: "Your GovernedAI account is being accessed for support",
    text: [
      `Hi ${params.targetName},`,
      "",
      `A GovernedAI platform administrator (${params.adminEmail}) has started a support session viewing your account.`,
      `This access is time-boxed and expires at ${params.expiresAt.toISOString()}.`,
      "",
      "Every action taken during this session is recorded in your organization's audit log.",
      "If you weren't expecting this, contact us at bootech.labs@gmail.com.",
    ].join("\n"),
  });
}

// Internal nudge only — sent to the org's own admins, not the vendor.
// Vendor-facing re-attestation outreach is a bigger scope decision,
// deliberately out of this slice. One email per org per overdue cycle
// (the cron caller controls that cadence, not this function).
export async function sendVendorReattestationDueEmail(params: {
  to: string[];
  organizationName: string;
  vendorNames: string[];
  vendorsUrl: string;
}) {
  if (!resend || params.to.length === 0) {
    if (!resend) console.warn("RESEND_API_KEY not set — skipping vendor re-attestation email");
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "GovernedAI <notifications@governedai.co>",
    to: params.to,
    subject: `Vendor re-attestation due — ${params.organizationName}`,
    text: [
      `The following vendor${params.vendorNames.length === 1 ? " is" : "s are"} past due for re-attestation in your GovernedAI vendor registry:`,
      "",
      ...params.vendorNames.map((name) => `- ${name}`),
      "",
      `Review and mark them re-attested: ${params.vendorsUrl}`,
    ].join("\n"),
  });
}
