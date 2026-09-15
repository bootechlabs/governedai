import { PrismaClient } from "@prisma/client";
import { stytchClient } from "../src/lib/stytch";

const prisma = new PrismaClient();

const ORG_SLUG = "bootech";
const ORG_NAME = "Bootech";
const ADMIN_EMAIL = "bootech.labs@gmail.com";

async function findOrCreateOrganization() {
  const { organizations } = await stytchClient.organizations.search({
    query: {
      operator: "AND",
      operands: [{ filter_name: "organization_slugs", filter_value: [ORG_SLUG] }],
    },
  });
  if (organizations.length > 0) return organizations[0];

  const { organization } = await stytchClient.organizations.create({
    organization_name: ORG_NAME,
    organization_slug: ORG_SLUG,
  });
  return organization;
}

async function findOrCreateAdminMember(organizationId: string) {
  const { members } = await stytchClient.organizations.members.search({
    organization_ids: [organizationId],
  });
  const existing = members.find((m) => m.email_address === ADMIN_EMAIL);
  if (existing) return existing;

  const { member } = await stytchClient.organizations.members.create({
    organization_id: organizationId,
    email_address: ADMIN_EMAIL,
    name: "Bootech Admin",
  });
  return member;
}

// The 5 regulations that used to be hardcoded in src/lib/risk-classification.ts
// (trigger logic) and src/lib/regulation-sections.ts (checklist content) —
// now data, not code, so a future regulation is a seed insert, not a
// migration + deploy. `code` matches the old Regulation enum member names
// so existing AuditLogEntry.detail JSON referencing those strings stays
// readable. Idempotent: upserted by `code` on every run.
const LEGACY_REGULATIONS = [
  {
    code: "NIST_AI_RMF",
    label: "NIST AI Risk Management Framework",
    citation: null,
    summary: null,
    sourceUrl: null,
    effectiveDate: null,
    triggerConfig: { kind: "TIER_AT_LEAST", tier: "MODERATE" },
    artifacts: [],
  },
  {
    code: "EU_AI_ACT",
    label: "EU AI Act",
    citation: null,
    summary: null,
    sourceUrl: null,
    effectiveDate: null,
    triggerConfig: { kind: "QUESTION_WEIGHT_AT_LEAST", questionKey: "euExposure", weight: 2 },
    artifacts: [],
  },
  {
    code: "ISO_42001",
    label: "ISO/IEC 42001",
    citation: null,
    summary: null,
    sourceUrl: null,
    effectiveDate: null,
    triggerConfig: { kind: "TIER_AT_LEAST", tier: "HIGH" },
    artifacts: [],
  },
  {
    code: "NYC_LL144",
    label: "NYC Local Law 144 — Automated Employment Decision Tools",
    citation: "NYC Local Law 144 of 2021",
    summary:
      "Applies to automated tools used to substantially assist or replace employment decisions for NYC-based roles. Requires an independent bias audit, publication of a summary, and advance notice to candidates/employees.",
    sourceUrl: null,
    effectiveDate: null,
    triggerConfig: { kind: "QUESTION_WEIGHT_AT_LEAST", questionKey: "employmentDecision", weight: 2 },
    artifacts: [
      {
        label: "Independent bias audit on file",
        description: "A bias audit conducted by an independent auditor within the past year.",
        evidenceCategory: "BIAS_AUDIT_REPORT" as const,
      },
      {
        label: "Bias audit summary available",
        description: "A summary of the bias audit results, suitable for publication.",
        evidenceCategory: "BIAS_AUDIT_REPORT" as const,
      },
      {
        label: "Candidate/employee notice issued",
        description:
          "Notice to candidates/employees that the tool is in use, at least 10 business days prior, including how to request an alternative process or accommodation.",
        evidenceCategory: "POLICY_DOCUMENT" as const,
      },
    ],
  },
  {
    code: "CO_SB21_169",
    label: "Colorado SB21-169 — Algorithm & Predictive Model Governance",
    citation: "Colorado SB21-169",
    summary:
      "Applies to algorithms/predictive models that could result in unfair discrimination in consequential decisions. Expect an impact assessment and consumer notice to be current.",
    sourceUrl: null,
    effectiveDate: null,
    triggerConfig: { kind: "QUESTION_WEIGHT_AT_LEAST", questionKey: "consequentialDecision", weight: 2 },
    artifacts: [
      {
        label: "Algorithmic impact assessment on file",
        description: "An assessment of the system's potential for unfair discriminatory outcomes.",
        evidenceCategory: "TEST_RESULT" as const,
      },
      {
        label: "Consumer notice issued",
        description: "Notice to affected consumers that an algorithm/predictive model is in use.",
        evidenceCategory: "POLICY_DOCUMENT" as const,
      },
    ],
  },
];

// Seven states passed AI-specific health-insurance laws in 2026 converging
// on one pattern: a licensed human must review and approve an
// AI-influenced coverage denial/downcode/delay before it's finalized. See
// docs/mvp-scope.md's "Differentiation roadmap" (slice 7) for the full
// citation list. Trigger is unconditional on state+template match —
// applicability is objective (where you operate, what you built), not
// gated by the self-reported human-review answer; the compliance
// checklist below is where that answer gets checked against evidence.
const STATE_SOURCE_URL = "https://www.beckerspayer.com/policy-updates/7-ai-health-insurance-state-laws-passed-in-2026/";
const PAYER_UM_TEMPLATES = ["PRIOR_AUTH_UM", "RCM_BILLING"] as const;

function humanReviewArtifact(lawLabel: string) {
  return [
    {
      label: "Human review policy on file",
      description: `Evidence that a licensed human professional reviews and approves every AI-influenced adverse determination before it's finalized, per ${lawLabel}.`,
      evidenceCategory: "POLICY_DOCUMENT" as const,
    },
  ];
}

const STATE_HEALTH_AI_LAWS = [
  {
    code: "AL_SB63",
    label: "Alabama SB 63",
    citation: "Alabama SB 63 (2026)",
    summary:
      "Requires a licensed human to review and approve any AI-influenced adverse coverage determination (denial, downcode, delay) before it is finalized.",
    sourceUrl: STATE_SOURCE_URL,
    effectiveDate: new Date("2026-10-01"),
    triggerConfig: { kind: "STATE_DEPLOYMENT", state: "AL", templates: [...PAYER_UM_TEMPLATES] },
    artifacts: humanReviewArtifact("Alabama SB 63"),
  },
  {
    code: "CO_HB1139",
    label: "Colorado HB 1139",
    citation: "Colorado HB 1139 (2026)",
    summary:
      "Requires a licensed human to review and approve any AI-influenced adverse coverage determination before it is finalized; also bars AI-delivered psychotherapy coverage and requires periodic accuracy audits.",
    sourceUrl: STATE_SOURCE_URL,
    effectiveDate: new Date("2027-01-01"),
    triggerConfig: { kind: "STATE_DEPLOYMENT", state: "CO", templates: [...PAYER_UM_TEMPLATES] },
    artifacts: humanReviewArtifact("Colorado HB 1139"),
  },
  {
    code: "GA_SB444",
    label: "Georgia SB 444",
    citation: "Georgia SB 444 (2026)",
    summary:
      "Requires a licensed human to review and approve any AI-influenced adverse coverage determination before it is finalized.",
    sourceUrl: STATE_SOURCE_URL,
    effectiveDate: new Date("2027-01-01"),
    triggerConfig: { kind: "STATE_DEPLOYMENT", state: "GA", templates: [...PAYER_UM_TEMPLATES] },
    artifacts: humanReviewArtifact("Georgia SB 444"),
  },
  {
    code: "IL_SB3114",
    label: "Illinois SB 3114",
    citation: "Illinois SB 3114 (2026)",
    summary: "Bans automated claim downcoding without human review.",
    sourceUrl: STATE_SOURCE_URL,
    effectiveDate: new Date("2028-01-01"),
    triggerConfig: { kind: "STATE_DEPLOYMENT", state: "IL", templates: [...PAYER_UM_TEMPLATES] },
    artifacts: humanReviewArtifact("Illinois SB 3114"),
  },
  {
    code: "IA_HF2635",
    label: "Iowa HF 2635",
    citation: "Iowa HF 2635 (2026)",
    summary:
      "Requires a licensed human to review and approve any AI-influenced adverse coverage determination before it is finalized.",
    sourceUrl: STATE_SOURCE_URL,
    effectiveDate: null,
    triggerConfig: { kind: "STATE_DEPLOYMENT", state: "IA", templates: [...PAYER_UM_TEMPLATES] },
    artifacts: humanReviewArtifact("Iowa HF 2635"),
  },
  {
    code: "UT_SB319",
    label: "Utah SB 319",
    citation: "Utah SB 319 (2026)",
    summary:
      "Requires a licensed human to review and approve any AI-influenced adverse coverage determination before it is finalized; also requires public disclosure of prior-authorization data and AI usage.",
    sourceUrl: STATE_SOURCE_URL,
    effectiveDate: new Date("2027-01-01"),
    triggerConfig: { kind: "STATE_DEPLOYMENT", state: "UT", templates: [...PAYER_UM_TEMPLATES] },
    artifacts: humanReviewArtifact("Utah SB 319"),
  },
  {
    code: "WA_SB5395",
    label: "Washington SB 5395",
    citation: "Washington SB 5395 (2026)",
    summary:
      "Requires a licensed human to review and approve any AI-influenced adverse coverage determination before it is finalized.",
    sourceUrl: STATE_SOURCE_URL,
    effectiveDate: new Date("2026-06-11"),
    triggerConfig: { kind: "STATE_DEPLOYMENT", state: "WA", templates: [...PAYER_UM_TEMPLATES] },
    artifacts: humanReviewArtifact("Washington SB 5395"),
  },
];

const ALL_REGULATIONS = [...LEGACY_REGULATIONS, ...STATE_HEALTH_AI_LAWS];

async function seedRegulations() {
  for (const [index, reg] of ALL_REGULATIONS.entries()) {
    const definition = await prisma.regulationDefinition.upsert({
      where: { code: reg.code },
      update: {
        label: reg.label,
        citation: reg.citation,
        summary: reg.summary,
        sourceUrl: reg.sourceUrl,
        effectiveDate: reg.effectiveDate,
        triggerConfig: reg.triggerConfig,
        sortOrder: index,
      },
      create: {
        code: reg.code,
        label: reg.label,
        citation: reg.citation,
        summary: reg.summary,
        sourceUrl: reg.sourceUrl,
        effectiveDate: reg.effectiveDate,
        triggerConfig: reg.triggerConfig,
        sortOrder: index,
      },
    });

    // Replace this regulation's artifacts wholesale rather than trying to
    // diff — the set is small and fully owned by this seed script.
    await prisma.regulationArtifactDefinition.deleteMany({ where: { regulationId: definition.id } });
    if (reg.artifacts.length > 0) {
      await prisma.regulationArtifactDefinition.createMany({
        data: reg.artifacts.map((artifact, sortOrder) => ({
          ...artifact,
          regulationId: definition.id,
          sortOrder,
        })),
      });
    }
  }
  console.log(`Seeded ${ALL_REGULATIONS.length} regulation definitions`);
}

async function main() {
  const organization = await findOrCreateOrganization();
  console.log("Stytch organization:", organization.organization_id);

  await prisma.organization.upsert({
    where: { id: organization.organization_id },
    update: { name: organization.organization_name },
    create: { id: organization.organization_id, name: organization.organization_name },
  });

  const member = await findOrCreateAdminMember(organization.organization_id);
  console.log("Stytch member:", member.member_id);

  await prisma.user.upsert({
    where: { id: member.member_id },
    // Bootech operates the platform, so its seeded admin is also the
    // platform admin — set on every run so it's granted retroactively to
    // an already-existing row too, not just on first create.
    update: { isPlatformAdmin: true },
    create: {
      id: member.member_id,
      organizationId: organization.organization_id,
      email: ADMIN_EMAIL,
      name: "Bootech Admin",
      role: "ADMIN",
      isPlatformAdmin: true,
    },
  });

  await seedRegulations();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
