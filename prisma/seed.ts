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
    triggerConfig: { kind: "TIER_AT_LEAST", tier: "MODERATE" },
    artifacts: [],
  },
  {
    code: "EU_AI_ACT",
    label: "EU AI Act",
    citation: null,
    summary: null,
    sourceUrl: null,
    triggerConfig: { kind: "QUESTION_WEIGHT_AT_LEAST", questionKey: "euExposure", weight: 2 },
    artifacts: [],
  },
  {
    code: "ISO_42001",
    label: "ISO/IEC 42001",
    citation: null,
    summary: null,
    sourceUrl: null,
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

async function seedRegulations() {
  for (const [index, reg] of LEGACY_REGULATIONS.entries()) {
    const definition = await prisma.regulationDefinition.upsert({
      where: { code: reg.code },
      update: {
        label: reg.label,
        citation: reg.citation,
        summary: reg.summary,
        sourceUrl: reg.sourceUrl,
        triggerConfig: reg.triggerConfig,
        sortOrder: index,
      },
      create: {
        code: reg.code,
        label: reg.label,
        citation: reg.citation,
        summary: reg.summary,
        sourceUrl: reg.sourceUrl,
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
  console.log(`Seeded ${LEGACY_REGULATIONS.length} regulation definitions`);
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
