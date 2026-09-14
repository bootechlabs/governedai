import Link from "next/link";
import {
  ArrowLeft,
  LayoutDashboard,
  ClipboardList,
  Users,
  KeyRound,
  Code,
  Building2,
  CircleQuestionMark,
  LogOut,
  Tag,
  type LucideIcon,
} from "lucide-react";
import {
  classificationConfig,
  deploymentStatusConfig,
  stageStatusConfig,
  riskTierConfig,
  baaStatusConfig,
  evidenceCategoryLabels,
} from "@/lib/badges";

export const dynamic = "force-dynamic";

const NAV_ICONS: { icon: LucideIcon; label: string; description: string }[] = [
  { icon: LayoutDashboard, label: "Dashboard", description: "Org-wide counts and what's pending review" },
  { icon: ClipboardList, label: "Inventory", description: "The full list of AI systems" },
  { icon: Users, label: "Users", description: "Admin-provisioned users and roles (admin only)" },
  { icon: KeyRound, label: "SSO", description: "Per-org SAML/OIDC connections (admin only)" },
  { icon: Code, label: "API keys", description: "Public API access keys (admin only)" },
  { icon: Building2, label: "Vendors", description: "The vendor registry (admin only)" },
  { icon: CircleQuestionMark, label: "Legend", description: "This page" },
  { icon: LogOut, label: "Sign out", description: "End your session" },
  { icon: ArrowLeft, label: "Back", description: "Return to the previous list" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8">
      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2">{children}</ul>
    </div>
  );
}

function Row({ icon: Icon, label, description }: { icon: LucideIcon; label: string; description: string }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
      <Icon size={18} className="flex-none text-zinc-500" />
      <span className="font-medium">{label}</span>
      <span className="text-zinc-500">{description}</span>
    </li>
  );
}

export default function LegendPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/systems" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:underline">
        <ArrowLeft size={14} />
        Dashboard
      </Link>

      <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <CircleQuestionMark size={22} />
        Icon legend
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        What every icon used across GovernedAI means.
      </p>

      <Section title="Navigation">
        {NAV_ICONS.map((item) => (
          <Row key={item.label} icon={item.icon} label={item.label} description={item.description} />
        ))}
      </Section>

      <Section title="Data classification">
        {Object.values(classificationConfig).map((c) => (
          <Row key={c.label} icon={c.icon} label={c.label} description="AI system data classification" />
        ))}
      </Section>

      <Section title="Deployment status">
        {Object.values(deploymentStatusConfig).map((c) => (
          <Row key={c.label} icon={c.icon} label={c.label} description="AI system deployment status" />
        ))}
      </Section>

      <Section title="Workflow stage status">
        {Object.values(stageStatusConfig).map((c) => (
          <Row key={c.label} icon={c.icon} label={c.label} description="Workflow stage status" />
        ))}
      </Section>

      <Section title="Risk tier">
        {Object.values(riskTierConfig).map((c) => (
          <Row key={c.label} icon={c.icon} label={c.label} description="Risk classification tier" />
        ))}
      </Section>

      <Section title="BAA status">
        {Object.values(baaStatusConfig).map((c) => (
          <Row key={c.label} icon={c.icon} label={c.label} description="Vendor BAA (Business Associate Agreement) status" />
        ))}
      </Section>

      <Section title="Evidence category">
        <Row
          icon={Tag}
          label="Tag"
          description={`Used for every evidence category: ${Object.values(evidenceCategoryLabels).join(", ")}`}
        />
      </Section>
    </div>
  );
}
