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
  type LucideIcon,
} from "lucide-react";
import type { DataClassification, DeploymentStatus, StageStatus } from "@prisma/client";

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

const classificationConfig: Record<
  DataClassification,
  { icon: LucideIcon; label: string; colorClass: string }
> = {
  PUBLIC: { icon: Globe, label: "Public", colorClass: "text-zinc-500" },
  INTERNAL: { icon: Building2, label: "Internal", colorClass: "text-blue-600 dark:text-blue-400" },
  CONFIDENTIAL: { icon: Lock, label: "Confidential", colorClass: "text-amber-600 dark:text-amber-400" },
  RESTRICTED: { icon: ShieldAlert, label: "Restricted", colorClass: "text-red-600 dark:text-red-400" },
};

export function ClassificationBadge({ value }: { value: DataClassification }) {
  const config = classificationConfig[value];
  return <Badge icon={config.icon} label={config.label} colorClass={config.colorClass} />;
}

const deploymentStatusConfig: Record<
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

const stageStatusConfig: Record<
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
