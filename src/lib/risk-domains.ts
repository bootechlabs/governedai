import { Lock, Scale, AlertTriangle, ShieldAlert, MessageSquareWarning, type LucideIcon } from "lucide-react";
import type { UseCaseTemplate } from "@prisma/client";

// Suggested accountability mapping — not persisted, not a legal or
// organizational assignment. See docs/mvp-scope.md "Differentiation
// roadmap — v1.2" for where this came from (a gap analysis against two
// external AI-governance frameworks, one of which anchors this exact
// domain → function mapping in a real MIT FutureTech risk-prioritization
// study, cited there — not in this file).
export type RiskDomain =
  | "PRIVACY"
  | "BIAS_DISCRIMINATION"
  | "UNSAFE_OVERRELIANCE"
  | "CYBERSECURITY"
  | "MISINFORMATION";

export const riskDomainConfig: Record<
  RiskDomain,
  { label: string; accountableFunction: string; icon: LucideIcon }
> = {
  PRIVACY: { label: "Privacy loss", accountableFunction: "Operations", icon: Lock },
  BIAS_DISCRIMINATION: { label: "Bias and discrimination", accountableFunction: "Compliance", icon: Scale },
  UNSAFE_OVERRELIANCE: {
    label: "Unsafe overreliance",
    accountableFunction: "Clinical leadership",
    icon: AlertTriangle,
  },
  CYBERSECURITY: { label: "Cyberattacks", accountableFunction: "IT security", icon: ShieldAlert },
  MISINFORMATION: {
    label: "False information",
    accountableFunction: "Board oversight",
    icon: MessageSquareWarning,
  },
};

// Which risk domains typically apply to a system, by use case — a
// heuristic bootstrap from the use case alone (not per-answer), same
// rigor level as other generic scoring in this app. Not exhaustive: a
// system's real risk profile may carry domains beyond its template's
// defaults.
const RISK_DOMAINS_BY_TEMPLATE: Record<UseCaseTemplate, RiskDomain[]> = {
  AMBIENT_SCRIBE: ["PRIVACY", "MISINFORMATION", "UNSAFE_OVERRELIANCE"],
  CLINICAL_DECISION_SUPPORT: ["UNSAFE_OVERRELIANCE", "BIAS_DISCRIMINATION", "MISINFORMATION"],
  PRIOR_AUTH_UM: ["BIAS_DISCRIMINATION", "UNSAFE_OVERRELIANCE", "PRIVACY"],
  RCM_BILLING: ["CYBERSECURITY", "PRIVACY"],
  PATIENT_CHATBOT: ["MISINFORMATION", "PRIVACY", "UNSAFE_OVERRELIANCE"],
  GENERIC: ["PRIVACY", "CYBERSECURITY"],
};

export function getRelevantRiskDomains(template: UseCaseTemplate): RiskDomain[] {
  return RISK_DOMAINS_BY_TEMPLATE[template];
}
