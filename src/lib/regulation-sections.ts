import type { EvidenceCategory } from "@prisma/client";

export interface RegulationArtifact {
  id: string;
  label: string;
  description: string;
  evidenceCategory: EvidenceCategory;
}

// A regulation's checklist content (title/citation/summary/artifacts) now
// lives in the RegulationDefinition/RegulationArtifactDefinition tables
// (see prisma/schema.prisma) rather than a static map here — a new state
// law is a seed-data insert, not a code change. Callers fetch the
// triggered rows (with artifacts included) and pass them in; regulations
// with zero artifacts (broad frameworks like NIST AI RMF/ISO 42001, which
// aren't a single checkable disclosure requirement) are filtered out by
// the caller before rendering, same behavior as before.
export interface TriggeredRegulation {
  id: string;
  code: string;
  label: string;
  citation: string | null;
  summary: string | null;
  artifacts: RegulationArtifact[];
}

export interface ArtifactStatus extends RegulationArtifact {
  onFile: boolean;
  evidenceLabel: string | null;
  evidenceUrl: string | null;
}

export interface RegulationSectionStatus {
  id: string;
  code: string;
  label: string;
  citation: string | null;
  summary: string | null;
  artifacts: ArtifactStatus[];
}

// Pure — takes already-fetched regulation/evidence data (no DB access
// here) so this stays unit-testable, same shape as matchVendorByName in
// src/lib/ai-systems.ts. "onFile" is true iff any evidence item on the
// system has the artifact's EvidenceCategory — this is a checklist of
// what's on file, not a legal determination; verify applicability and
// completeness with counsel.
export function computeRegulationSectionStatuses(
  triggeredRegulations: TriggeredRegulation[],
  evidence: { category: EvidenceCategory; label: string | null; fileUrl: string | null; linkUrl: string | null }[],
): RegulationSectionStatus[] {
  return triggeredRegulations.map((regulation) => ({
    id: regulation.id,
    code: regulation.code,
    label: regulation.label,
    citation: regulation.citation,
    summary: regulation.summary,
    artifacts: regulation.artifacts.map((artifact) => {
      const match = evidence.find((e) => e.category === artifact.evidenceCategory);
      return {
        ...artifact,
        onFile: !!match,
        evidenceLabel: match?.label ?? null,
        evidenceUrl: match ? (match.fileUrl ?? match.linkUrl) : null,
      };
    }),
  }));
}
