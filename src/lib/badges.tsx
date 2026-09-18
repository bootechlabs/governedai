import {
  Globe,
  Building2,
  Lock,
  ShieldAlert,
  CalendarClock,
  FlaskConical,
  Rocket,
  Archive,
  Clock,
  Eye,
  CheckCircle2,
  ShieldCheck,
  XCircle,
  Gauge,
  AlertTriangle,
  Flame,
  FileCheck2,
  FileWarning,
  FileClock,
  FileX2,
  Tag,
  Gavel,
  Compass,
  Siren,
  FilePenLine,
  BadgeCheck,
  CircleAlert,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import type {
  DataClassification,
  DeploymentStatus,
  StageStatus,
  RiskTier,
  BaaStatus,
  EvidenceCategory,
  RegulatoryUpdateKind,
} from "@prisma/client";
import { KIND_LABELS, type ReviewState } from "@/lib/regulatory-updates";

// Canonical status color vocabulary — every badge on the app uses one of
// these, so a color always means the same thing everywhere it appears:
//   zinc   = neutral / baseline, nothing to note
//   amber  = early or moderate concern, needs attention soon
//   orange = high concern (reserved for 4-step severity scales, alongside
//            zinc/amber/red, so a scale with 4 real levels has 4 real steps)
//   red    = critical / blocking, needs attention now
//   emerald = cleared / good / approved
// Don't introduce a new color for a new badge — map it onto this scale.
function Badge({
  icon: Icon,
  label,
  colorClass,
}: {
  icon: LucideIcon;
  label: string;
  colorClass: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${colorClass}`}>
      <Icon size={14} strokeWidth={2} />
      {label}
    </span>
  );
}

export const classificationConfig: Record<
  DataClassification,
  { icon: LucideIcon; label: string; colorClass: string }
> = {
  PUBLIC: { icon: Globe, label: "Public", colorClass: "text-zinc-500" },
  INTERNAL: { icon: Building2, label: "Internal", colorClass: "text-amber-600 dark:text-amber-400" },
  CONFIDENTIAL: { icon: Lock, label: "Confidential", colorClass: "text-orange-600 dark:text-orange-400" },
  RESTRICTED: { icon: ShieldAlert, label: "Restricted", colorClass: "text-red-600 dark:text-red-400" },
};

export function ClassificationBadge({ value }: { value: DataClassification }) {
  const config = classificationConfig[value];
  return <Badge icon={config.icon} label={config.label} colorClass={config.colorClass} />;
}

export const deploymentStatusConfig: Record<
  DeploymentStatus,
  { icon: LucideIcon; label: string; colorClass: string }
> = {
  PLANNED: { icon: CalendarClock, label: "Planned", colorClass: "text-zinc-500" },
  PILOT: { icon: FlaskConical, label: "Pilot", colorClass: "text-amber-600 dark:text-amber-400" },
  PRODUCTION: { icon: Rocket, label: "Production", colorClass: "text-emerald-600 dark:text-emerald-400" },
  RETIRED: { icon: Archive, label: "Retired", colorClass: "text-zinc-500" },
};

export function DeploymentStatusBadge({ value }: { value: DeploymentStatus }) {
  const config = deploymentStatusConfig[value];
  return <Badge icon={config.icon} label={config.label} colorClass={config.colorClass} />;
}

export const stageStatusConfig: Record<
  StageStatus,
  { icon: LucideIcon; label: string; colorClass: string }
> = {
  PENDING: { icon: Clock, label: "Pending", colorClass: "text-zinc-500" },
  IN_REVIEW: { icon: Eye, label: "In review", colorClass: "text-amber-600 dark:text-amber-400" },
  APPROVED: { icon: CheckCircle2, label: "Approved", colorClass: "text-emerald-600 dark:text-emerald-400" },
  CONDITIONALLY_APPROVED: {
    icon: ShieldCheck,
    label: "Conditionally approved",
    colorClass: "text-amber-600 dark:text-amber-400",
  },
  REJECTED: { icon: XCircle, label: "Rejected", colorClass: "text-red-600 dark:text-red-400" },
};

export function StageStatusBadge({ value }: { value: StageStatus }) {
  const config = stageStatusConfig[value];
  return <Badge icon={config.icon} label={config.label} colorClass={config.colorClass} />;
}

export const riskTierConfig: Record<RiskTier, { icon: LucideIcon; label: string; colorClass: string }> = {
  LOW: { icon: Gauge, label: "Low risk", colorClass: "text-zinc-500" },
  MODERATE: { icon: Gauge, label: "Moderate risk", colorClass: "text-amber-600 dark:text-amber-400" },
  HIGH: { icon: AlertTriangle, label: "High risk", colorClass: "text-orange-600 dark:text-orange-400" },
  CRITICAL: { icon: Flame, label: "Critical risk", colorClass: "text-red-600 dark:text-red-400" },
};

export function RiskTierBadge({ value }: { value: RiskTier }) {
  const config = riskTierConfig[value];
  return <Badge icon={config.icon} label={config.label} colorClass={config.colorClass} />;
}

export const baaStatusConfig: Record<BaaStatus, { icon: LucideIcon; label: string; colorClass: string }> = {
  NOT_APPLICABLE: { icon: FileX2, label: "BAA not applicable", colorClass: "text-zinc-500" },
  REQUIRED_NOT_ON_FILE: {
    icon: FileWarning,
    label: "BAA required, not on file",
    colorClass: "text-red-600 dark:text-red-400",
  },
  ON_FILE: { icon: FileCheck2, label: "BAA on file", colorClass: "text-emerald-600 dark:text-emerald-400" },
  EXPIRED: { icon: FileClock, label: "BAA expired", colorClass: "text-amber-600 dark:text-amber-400" },
};

export function BaaStatusBadge({ value }: { value: BaaStatus }) {
  const config = baaStatusConfig[value];
  return <Badge icon={config.icon} label={config.label} colorClass={config.colorClass} />;
}

export const evidenceCategoryLabels: Record<EvidenceCategory, string> = {
  GENERAL: "General",
  BAA: "BAA",
  SOC2_REPORT: "SOC 2 report",
  MODEL_CARD: "Model card",
  BIAS_AUDIT_REPORT: "Bias audit report",
  TEST_RESULT: "Test result",
  APPROVAL_RECORD: "Approval record",
  POLICY_DOCUMENT: "Policy document",
  SUBPROCESSOR_LIST: "Subprocessor list",
  SECURITY_EVALUATION: "Security evaluation",
  OVERRIDE_REVOCATION_PROCEDURE: "Override/revocation procedure",
  ACCESS_LIFECYCLE_POLICY: "Access lifecycle/expiration policy",
  OTHER: "Other",
};

export function EvidenceCategoryBadge({ value }: { value: EvidenceCategory }) {
  return <Badge icon={Tag} label={evidenceCategoryLabels[value]} colorClass="text-zinc-500" />;
}

// Regulatory updates (slice 17). The kind is descriptive, not a severity, so
// every kind is neutral zinc — only the flags below carry amber/emerald.
export const regulatoryUpdateKindConfig: Record<
  RegulatoryUpdateKind,
  { icon: LucideIcon; label: string; colorClass: string }
> = {
  ENACTED: { icon: Gavel, label: KIND_LABELS.ENACTED, colorClass: "text-zinc-600 dark:text-zinc-400" },
  EFFECTIVE_DATE_CHANGE: {
    icon: CalendarClock,
    label: KIND_LABELS.EFFECTIVE_DATE_CHANGE,
    colorClass: "text-zinc-600 dark:text-zinc-400",
  },
  GUIDANCE: { icon: Compass, label: KIND_LABELS.GUIDANCE, colorClass: "text-zinc-600 dark:text-zinc-400" },
  ENFORCEMENT: { icon: Siren, label: KIND_LABELS.ENFORCEMENT, colorClass: "text-zinc-600 dark:text-zinc-400" },
  PROPOSED: { icon: FilePenLine, label: KIND_LABELS.PROPOSED, colorClass: "text-zinc-600 dark:text-zinc-400" },
  ACCREDITATION: {
    icon: BadgeCheck,
    label: KIND_LABELS.ACCREDITATION,
    colorClass: "text-zinc-600 dark:text-zinc-400",
  },
  OTHER: { icon: Tag, label: KIND_LABELS.OTHER, colorClass: "text-zinc-600 dark:text-zinc-400" },
};

export function UpdateKindBadge({ value }: { value: RegulatoryUpdateKind }) {
  const config = regulatoryUpdateKindConfig[value];
  return <Badge icon={config.icon} label={config.label} colorClass={config.colorClass} />;
}

export const updateFlagConfig = {
  actionRequired: {
    icon: CircleAlert,
    label: "Action may be needed",
    colorClass: "text-amber-600 dark:text-amber-400",
  },
  needsReview: { icon: Eye, label: "Needs review", colorClass: "text-amber-600 dark:text-amber-400" },
  stale: {
    icon: RefreshCw,
    label: "Revised since you reviewed",
    colorClass: "text-amber-600 dark:text-amber-400",
  },
  reviewed: { icon: CheckCircle2, label: "Reviewed", colorClass: "text-emerald-600 dark:text-emerald-400" },
} as const;

export function UpdateFlagBadge({ flag }: { flag: keyof typeof updateFlagConfig }) {
  const config = updateFlagConfig[flag];
  return <Badge icon={config.icon} label={config.label} colorClass={config.colorClass} />;
}

// The review-state badge for an update that affects at least one system.
export function UpdateReviewBadge({ state }: { state: ReviewState }) {
  return <UpdateFlagBadge flag={state === "reviewed" ? "reviewed" : state === "stale" ? "stale" : "needsReview"} />;
}
