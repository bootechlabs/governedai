import { FileX2, Bot, Scale, ShieldX, ShieldAlert, CircleAlert, type LucideIcon } from "lucide-react";
import type { IncidentCategory } from "@prisma/client";

// Badge config for IncidentCategory — same pattern as src/lib/badges.tsx.
// Severity reuses RiskTierBadge directly (badges.tsx); no separate scale.
export const incidentCategoryConfig: Record<IncidentCategory, { icon: LucideIcon; label: string }> = {
  INCORRECT_DENIAL: { icon: FileX2, label: "Incorrect denial" },
  HALLUCINATED_OUTPUT: { icon: Bot, label: "Hallucinated output" },
  BIAS_FINDING: { icon: Scale, label: "Bias finding" },
  PRIVACY_BREACH: { icon: ShieldX, label: "Privacy breach" },
  SECURITY_INCIDENT: { icon: ShieldAlert, label: "Security incident" },
  OTHER: { icon: CircleAlert, label: "Other" },
};

export function IncidentCategoryBadge({ value }: { value: IncidentCategory }) {
  const config = incidentCategoryConfig[value];
  const Icon = config.icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
      <Icon size={14} strokeWidth={2} />
      {config.label}
    </span>
  );
}
