import { PrismaClient, type RegulatoryUpdateKind, type UseCaseTemplate } from "@prisma/client";

// Slice 17 seed candidates for the regulatory updates feed. Run with
// `pnpm run db:seed:updates`.
//
// Rules this script follows on purpose:
//  - Everything is inserted as a DRAFT. Nothing here ever sets publishedAt: a
//    human re-verifies each item against its primary source in
//    /platform/updates, then publishes it.
//  - Create-if-missing, keyed on `slug`. An existing row is left untouched, so
//    re-running can never overwrite an edit or revision a curator made.
//  - Regulation links are looked up by RegulationDefinition.code; run
//    `pnpm run db:seed` first so those rows exist.
//
// VERIFY BEFORE PUBLISHING. Dates and summaries below were gathered from web
// search results on 2026-09-18, not from a curator's read of each primary
// source. Known open points:
//  - Alabama: text and the 2026-10-01 effective date read directly from the
//    enrolled bill; the enactment date (04-17) is from secondary coverage.
//  - Georgia: signing not confirmed by my sources; eventDate is the date the
//    Senate agreed to House amendments (final passage), not a signing date.
//  - Illinois: SB 3114 is the Transparency in Downcoding Act (human review of
//    downcoding), and the sourceUrl is a bill tracker, not ilga.gov. The
//    RegulationDefinition's 2028-01-01 effective date is unverified, so it is
//    left blank here.
//  - Iowa: sources say effective 2026-07-01; the RegulationDefinition row has
//    no effective date. Update that row if the primary source agrees.
//  - Utah: sources describe disclosure plus independent medical judgment for
//    adverse determinations, and say it does not prohibit AI use; check that
//    the RegulationDefinition summary (human approval before finalization) is
//    not overstating it.
//  - Joint Commission: sources say announced 2026-06-01; the launch was
//    recorded as May 2026 elsewhere. Placeholder only — do not publish until
//    the certification criteria research (v1.1+ roadmap) is done.

const prisma = new PrismaClient();

const PAYER_UM: UseCaseTemplate[] = ["PRIOR_AUTH_UM", "RCM_BILLING"];

interface Candidate {
  slug: string;
  title: string;
  summary: string;
  whyItMatters: string;
  kind: RegulatoryUpdateKind;
  sourceName: string;
  sourceUrl: string;
  eventDate: string;
  effectiveDate: string | null;
  useCaseTemplates: UseCaseTemplate[];
  regulationCodes: string[];
  actionRequired: boolean;
}

const MAY_MATTER_STATE =
  "May matter if you operate in this state and use AI in prior authorization, utilization management, or claims review.";

const CANDIDATES: Candidate[] = [
  {
    slug: "al-sb63-ai-utilization-review",
    title: "Alabama enacts SB 63 limiting AI in health insurance coverage decisions",
    summary:
      "Alabama SB 63 requires that a determination to deny, delay, or modify a prior authorization request on medical necessity be made by a licensed physician or other competent health care professional, and that AI-based determinations consider the enrollee's medical history and clinical circumstances. It takes effect October 1, 2026.",
    whyItMatters: MAY_MATTER_STATE,
    kind: "ENACTED",
    sourceName: "Alabama Legislature (enrolled bill)",
    sourceUrl: "https://alison.legislature.state.al.us/files/pdf/SearchableInstruments/2026RS/SB63-enr.pdf",
    eventDate: "2026-04-17",
    effectiveDate: "2026-10-01",
    useCaseTemplates: PAYER_UM,
    regulationCodes: ["AL_SB63"],
    actionRequired: true,
  },
  {
    slug: "co-hb1139-ai-in-health-care",
    title: "Colorado enacts HB26-1139 on AI in health care",
    summary:
      "Colorado HB26-1139, signed June 2, 2026, provides that a carrier's denial of coverage based on medical necessity may not be issued solely on the output of an AI system without review by a licensed clinician. It takes effect January 1, 2027.",
    whyItMatters: MAY_MATTER_STATE,
    kind: "ENACTED",
    sourceName: "Colorado General Assembly",
    sourceUrl: "https://leg.colorado.gov/bills/HB26-1139",
    eventDate: "2026-06-02",
    effectiveDate: "2027-01-01",
    useCaseTemplates: PAYER_UM,
    regulationCodes: ["CO_HB1139"],
    actionRequired: true,
  },
  {
    slug: "ga-sb444-ai-coverage-decisions",
    title: "Georgia SB 444 limits sole reliance on AI for insurance coverage decisions",
    summary:
      "Georgia SB 444 amends the private review agent statute so coverage decisions for health care services cannot be based solely on AI systems or other software tools. The Senate agreed to the House amendments on March 25, 2026; the law is effective January 1, 2027.",
    whyItMatters: MAY_MATTER_STATE,
    kind: "ENACTED",
    sourceName: "Office of the Governor of Georgia (signed legislation)",
    sourceUrl: "https://gov.georgia.gov/document/2026-signed-legislation/sb-444/download",
    eventDate: "2026-03-25",
    effectiveDate: "2027-01-01",
    useCaseTemplates: PAYER_UM,
    regulationCodes: ["GA_SB444"],
    actionRequired: true,
  },
  {
    slug: "il-sb3114-transparency-in-downcoding",
    title: "Illinois enacts the Transparency in Downcoding Act (SB 3114)",
    summary:
      "Illinois SB 3114 bars insurers from using an automated process to downcode a claim without a person reviewing it, and requires a process for providers to dispute downcoding. Reported as signed July 10, 2026 (Public Act 104-0568).",
    whyItMatters:
      "May matter if you use AI in claims review or revenue-cycle workflows that touch coding determinations in Illinois.",
    kind: "ENACTED",
    sourceName: "LegiScan bill tracker (replace with ilga.gov before publishing)",
    sourceUrl: "https://legiscan.com/IL/bill/SB3114/2025",
    eventDate: "2026-07-10",
    effectiveDate: null,
    useCaseTemplates: PAYER_UM,
    regulationCodes: ["IL_SB3114"],
    actionRequired: false,
  },
  {
    slug: "ia-hf2635-ai-prior-authorization",
    title: "Iowa enacts HF 2635 on utilization review and AI",
    summary:
      "Iowa HF 2635 allows an AI-based algorithm for the initial review of a prior authorization request but not as the sole basis to deny, delay, or downgrade a medical necessity request; a credentialed human makes the final decision. Reported as signed May 13, 2026.",
    whyItMatters: MAY_MATTER_STATE,
    kind: "ENACTED",
    sourceName: "Iowa Legislature (bill history)",
    sourceUrl: "https://www.legis.iowa.gov/legislation/billTracking/billHistory?enhanced=true&ga=91&billName=HF2635",
    eventDate: "2026-05-13",
    effectiveDate: "2026-07-01",
    useCaseTemplates: PAYER_UM,
    regulationCodes: ["IA_HF2635"],
    actionRequired: true,
  },
  {
    slug: "ut-sb319-preauthorization-amendments",
    title: "Utah enacts SB 319, Health Insurance Preauthorization Amendments",
    summary:
      "Utah SB 319 requires insurers to disclose when AI is used in reviewing prior authorization requests and requires a reviewer of an adverse determination to use independent medical judgment. Reported as enacted March 19, 2026, effective January 1, 2027.",
    whyItMatters: MAY_MATTER_STATE,
    kind: "ENACTED",
    sourceName: "Utah State Legislature (enrolled bill)",
    sourceUrl: "https://le.utah.gov/Session/2026/bills/enrolled/SB0319.pdf",
    eventDate: "2026-03-19",
    effectiveDate: "2027-01-01",
    useCaseTemplates: PAYER_UM,
    regulationCodes: ["UT_SB319"],
    actionRequired: false,
  },
  {
    slug: "wa-sb5395-prior-authorization-ai",
    title: "Washington enacts SB 5395 on prior authorization transparency and AI",
    summary:
      "Washington SB 5395, signed March 23, 2026, provides that AI may not be the sole means used to deny, delay, or modify health care services; algorithms may process and approve requests but not deny care on medical necessity without human review. Effective June 11, 2026.",
    whyItMatters: MAY_MATTER_STATE,
    kind: "ENACTED",
    sourceName: "Washington State Legislature (Senate bill report)",
    sourceUrl:
      "https://lawfilesext.leg.wa.gov/biennium/2025-26/Pdf/Bill%20Reports/Senate/5395-S2.E%20SBR%20HA%2026.pdf",
    eventDate: "2026-03-23",
    effectiveDate: "2026-06-11",
    useCaseTemplates: PAYER_UM,
    regulationCodes: ["WA_SB5395"],
    actionRequired: true,
  },
  {
    slug: "joint-commission-responsible-use-of-ai-certification",
    title: "Joint Commission launches Responsible Use of AI in Healthcare certification",
    summary:
      "The Joint Commission released a voluntary Responsible Use of AI in Healthcare certification for health care organizations, organized around governance, data management, risk and bias reduction, monitoring and validation, and transparency and training.",
    whyItMatters:
      "May matter if your organization is Joint Commission accredited and wants to show AI governance to surveyors or partners.",
    kind: "ACCREDITATION",
    sourceName: "The Joint Commission",
    sourceUrl:
      "https://www.jointcommission.org/en-us/knowledge-library/news/2026-05-responsible-use-of-ai-in-healthcare-certification",
    eventDate: "2026-06-01",
    effectiveDate: null,
    useCaseTemplates: [],
    regulationCodes: [],
    actionRequired: false,
  },
];

async function main() {
  const curator = await prisma.user.findFirst({ where: { isPlatformAdmin: true }, orderBy: { createdAt: "asc" } });
  if (!curator) {
    throw new Error("No platform admin user found — run `pnpm run db:seed` first");
  }

  const regulations = await prisma.regulationDefinition.findMany({ select: { id: true, code: true } });
  const regulationIdByCode = new Map(regulations.map((r) => [r.code, r.id]));

  let created = 0;
  for (const candidate of CANDIDATES) {
    const existing = await prisma.regulatoryUpdate.findUnique({ where: { slug: candidate.slug }, select: { id: true } });
    if (existing) {
      console.log(`exists, left untouched: ${candidate.slug}`);
      continue;
    }

    const regulationIds: string[] = [];
    for (const code of candidate.regulationCodes) {
      const id = regulationIdByCode.get(code);
      if (id) regulationIds.push(id);
      else console.warn(`  ! regulation ${code} not found — run \`pnpm run db:seed\`; ${candidate.slug} created without that link`);
    }

    await prisma.regulatoryUpdate.create({
      data: {
        slug: candidate.slug,
        title: candidate.title,
        summary: candidate.summary,
        whyItMatters: candidate.whyItMatters,
        kind: candidate.kind,
        sourceName: candidate.sourceName,
        sourceUrl: candidate.sourceUrl,
        eventDate: new Date(candidate.eventDate),
        effectiveDate: candidate.effectiveDate ? new Date(candidate.effectiveDate) : null,
        useCaseTemplates: candidate.useCaseTemplates,
        actionRequired: candidate.actionRequired,
        createdById: curator.id,
        regulations: { create: regulationIds.map((regulationId) => ({ regulationId })) },
      },
    });
    created++;
    console.log(`created draft: ${candidate.slug}`);
  }
  console.log(`Done: ${created} draft(s) created, ${CANDIDATES.length - created} already present. Nothing was published.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
