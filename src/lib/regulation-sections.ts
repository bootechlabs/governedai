import type { Regulation, EvidenceCategory } from "@prisma/client";

export interface RegulationArtifact {
  label: string;
  description: string;
  evidenceCategory: EvidenceCategory;
}

export interface RegulationSection {
  title: string;
  citation: string;
  summary: string;
  artifacts: RegulationArtifact[];
}

// Only regulations with one specific, checkable notice/audit artifact get
// a section — NIST AI RMF and ISO/IEC 42001 are broad management
// frameworks, not a single disclosure requirement, so they're listed as
// triggered elsewhere in the report but don't get a checklist here.
//
// Every item maps to an EvidenceCategory (see prisma/schema.prisma) so
// the report can show real on-file/not-on-file status against whatever
// evidence is actually attached, instead of asserting compliance the app
// has no way of actually knowing. This is a checklist of what's on file,
// not a legal determination — verify applicability and completeness with
// counsel.
export const REGULATION_SECTIONS: Partial<Record<Regulation, RegulationSection>> = {
  NYC_LL144: {
    title: "NYC Local Law 144 — Automated Employment Decision Tools",
    citation: "NYC Local Law 144 of 2021",
    summary:
      "Applies to automated tools used to substantially assist or replace employment decisions for NYC-based roles. Requires an independent bias audit, publication of a summary, and advance notice to candidates/employees.",
    artifacts: [
      {
        label: "Independent bias audit on file",
        description: "A bias audit conducted by an independent auditor within the past year.",
        evidenceCategory: "BIAS_AUDIT_REPORT",
      },
      {
        label: "Bias audit summary available",
        description: "A summary of the bias audit results, suitable for publication.",
        evidenceCategory: "BIAS_AUDIT_REPORT",
      },
      {
        label: "Candidate/employee notice issued",
        description:
          "Notice to candidates/employees that the tool is in use, at least 10 business days prior, including how to request an alternative process or accommodation.",
        evidenceCategory: "POLICY_DOCUMENT",
      },
    ],
  },
  CO_SB21_169: {
    title: "Colorado SB21-169 — Algorithm & Predictive Model Governance",
    citation: "Colorado SB21-169",
    summary:
      "Applies to algorithms/predictive models that could result in unfair discrimination in consequential decisions. Expect an impact assessment and consumer notice to be current.",
    artifacts: [
      {
        label: "Algorithmic impact assessment on file",
        description: "An assessment of the system's potential for unfair discriminatory outcomes.",
        evidenceCategory: "TEST_RESULT",
      },
      {
        label: "Consumer notice issued",
        description: "Notice to affected consumers that an algorithm/predictive model is in use.",
        evidenceCategory: "POLICY_DOCUMENT",
      },
    ],
  },
};

export interface ArtifactStatus extends RegulationArtifact {
  onFile: boolean;
  evidenceLabel: string | null;
  evidenceUrl: string | null;
}

export interface RegulationSectionStatus extends RegulationSection {
  regulation: Regulation;
  artifacts: ArtifactStatus[];
}

// Pure — takes an already-fetched evidence list (category/label/url only)
// so this stays unit-testable without a DB round trip, same shape as
// matchVendorByName in src/lib/ai-systems.ts.
export function computeRegulationSectionStatuses(
  triggeredRegulations: Regulation[],
  evidence: { category: EvidenceCategory; label: string | null; fileUrl: string | null; linkUrl: string | null }[],
): RegulationSectionStatus[] {
  const statuses: RegulationSectionStatus[] = [];

  for (const regulation of triggeredRegulations) {
    const section = REGULATION_SECTIONS[regulation];
    if (!section) continue;

    statuses.push({
      ...section,
      regulation,
      artifacts: section.artifacts.map((artifact) => {
        const match = evidence.find((e) => e.category === artifact.evidenceCategory);
        return {
          ...artifact,
          onFile: !!match,
          evidenceLabel: match?.label ?? null,
          evidenceUrl: match ? (match.fileUrl ?? match.linkUrl) : null,
        };
      }),
    });
  }

  return statuses;
}
