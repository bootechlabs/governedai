import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  ScrollText,
  Activity,
  Users,
  KeyRound,
  Code,
  BookOpen,
  BookMarked,
  CircleQuestionMark,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@prisma/client";
import { canManageUsers, canManageSso, canManageApiKeys, canManageVendors } from "@/lib/permissions";

// The app's navigation, defined once as data. The desktop sidebar, the phone
// drawer, and the Legend page all render this same list, and a future mobile
// bottom bar or native menu can too — labels, icons, structure, and which
// roles see what live here and nowhere else. Client-safe on purpose: only
// lucide icons and the pure role checks in permissions.ts.
export interface NavItem {
  id: string;
  label: string;
  // Shown on the Legend page.
  description: string;
  icon: LucideIcon;
  // A group has children and no href of its own.
  href?: string;
  children?: NavItem[];
  // Must match the pathname exactly (otherwise a prefix match), for hrefs
  // that are prefixes of a sibling's, like /systems and /systems/api-keys.
  exact?: boolean;
  adminOnly?: boolean;
  visible?: (role: UserRole) => boolean;
}

// Sections render with a divider between them; the last one is pinned to the
// bottom of the sidebar.
export const NAV_SECTIONS: NavItem[][] = [
  [
    {
      id: "dashboard",
      label: "Dashboard",
      description: "Org-wide counts and charts",
      icon: LayoutDashboard,
      href: "/systems",
      exact: true,
    },
    {
      id: "inventory",
      label: "Inventory",
      description: "The full list of AI systems",
      icon: ClipboardList,
      href: "/systems/inventory",
    },
    {
      id: "vendors",
      label: "Vendors",
      description: "The vendor registry (admin only)",
      icon: Building2,
      href: "/systems/vendors",
      adminOnly: true,
      visible: canManageVendors,
    },
  ],
  [
    {
      id: "logs",
      label: "Logs",
      description: "Records of what happened in your organization",
      icon: ScrollText,
      children: [
        {
          id: "activity",
          label: "Activity log",
          description: "Every change and decision across all systems",
          icon: Activity,
          href: "/systems/activity",
        },
      ],
    },
  ],
  [
    {
      id: "users",
      label: "Users",
      description: "Admin-provisioned users and roles (admin only)",
      icon: Users,
      href: "/systems/users",
      adminOnly: true,
      visible: canManageUsers,
    },
    {
      id: "sso",
      label: "SSO",
      description: "Per-org SAML/OIDC connections (admin only)",
      icon: KeyRound,
      href: "/systems/sso",
      adminOnly: true,
      visible: canManageSso,
    },
  ],
  [
    {
      id: "api",
      label: "API",
      description: "Public API access and documentation",
      icon: Code,
      children: [
        {
          id: "api-keys",
          label: "API keys",
          description: "Create and revoke API keys (admin only)",
          icon: KeyRound,
          href: "/systems/api-keys",
          exact: true,
          adminOnly: true,
          visible: canManageApiKeys,
        },
        {
          id: "api-docs",
          label: "API docs",
          description: "Quick start and error reference",
          icon: BookOpen,
          href: "/systems/api-keys/docs",
          exact: true,
        },
        {
          id: "api-reference",
          label: "OpenAPI reference",
          description: "Interactive reference with a test console",
          icon: BookMarked,
          href: "/systems/api-keys/docs/reference",
          exact: true,
        },
      ],
    },
  ],
  [
    {
      id: "legend",
      label: "Legend",
      description: "What every icon means (this page)",
      icon: CircleQuestionMark,
      href: "/systems/legend",
    },
  ],
];

// Path segments under /systems that are real pages, not a system's id. Used
// only so a system-detail page (/systems/<id>) highlights Inventory.
const RESERVED_SEGMENTS = new Set([
  "inventory",
  "vendors",
  "activity",
  "users",
  "sso",
  "api-keys",
  "legend",
  "profile",
  "import",
  "portfolio-report",
]);
// Pages launched from the Inventory page (bulk import, portfolio export).
const INVENTORY_RELATED_SEGMENTS = new Set(["import", "portfolio-report"]);

function isVisible(item: NavItem, role: UserRole): boolean {
  return item.visible ? item.visible(role) : true;
}

// Filters by role and drops groups left with no children and sections left
// with no items.
export function visibleNav(role: UserRole): NavItem[][] {
  return NAV_SECTIONS.map((section) =>
    section
      .filter((item) => isVisible(item, role))
      .map((item) =>
        item.children ? { ...item, children: item.children.filter((c) => isVisible(c, role)) } : item,
      )
      .filter((item) => !item.children || item.children.length > 0),
  ).filter((section) => section.length > 0);
}

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.children) return item.children.some((child) => isNavActive(child, pathname));
  if (!item.href) return false;
  if (item.exact) return pathname === item.href;
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
  // A system's detail page lives at /systems/<id>: it belongs to Inventory.
  if (item.id === "inventory") {
    const [, root, segment] = pathname.split("/");
    if (root !== "systems" || !segment) return false;
    return INVENTORY_RELATED_SEGMENTS.has(segment) || !RESERVED_SEGMENTS.has(segment);
  }
  return false;
}

// The OpenAPI reference has its own sidebar, so the app nav gets out of the way
// there (without touching the saved collapse preference).
export function forcesCollapsedNav(pathname: string): boolean {
  return pathname === "/systems/api-keys/docs/reference";
}

// Sidebar collapse preference, remembered in a cookie so the server can render
// the right state on first paint (no flash). "auto" = never chosen: collapsed
// below the xl breakpoint, expanded above it, decided purely in CSS.
export type NavPref = "auto" | "collapsed" | "expanded";
export const NAV_COOKIE = "governedai_nav";

export function parseNavPref(raw: string | null | undefined): NavPref {
  return raw === "collapsed" || raw === "expanded" ? raw : "auto";
}
