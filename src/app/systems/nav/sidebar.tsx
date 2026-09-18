"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { visibleNav, forcesCollapsedNav } from "@/lib/nav";
import { useNav } from "./nav-provider";
import { NavList } from "./nav-list";

// Desktop/tablet sidebar (md and up); phones get MobileDrawer instead. Width
// and label visibility come from data-nav via CSS only, so "auto" (collapsed
// below xl, expanded from xl up) needs no JavaScript and can't flash.
export function Sidebar({ role, footer }: { role: UserRole; footer: React.ReactNode }) {
  const { pref, toggle, expand } = useNav();
  const pathname = usePathname();
  const sections = useMemo(() => visibleNav(role), [role]);

  // The OpenAPI reference has its own sidebar, so the app nav steps aside there
  // without touching the saved preference.
  const forced = forcesCollapsedNav(pathname);
  const dataNav = forced ? "collapsed" : pref;

  // The last section (Legend) is pinned to the bottom.
  const main = sections.slice(0, -1);
  const pinned = sections.slice(-1);

  const isCollapsedNow = () =>
    forced || pref === "collapsed" || (pref === "auto" && !window.matchMedia("(min-width: 1280px)").matches);

  return (
    <aside
      data-nav={dataNav}
      aria-label="Main"
      className="group/nav sticky top-14 hidden h-[calc(100dvh-3.5rem)] shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-zinc-200 py-2 transition-[width] duration-150 data-[nav=auto]:w-14 data-[nav=collapsed]:w-14 data-[nav=expanded]:w-56 md:flex xl:data-[nav=auto]:w-56 dark:border-zinc-800"
    >
      <div className="px-2">
        <button
          type="button"
          onClick={toggle}
          disabled={forced}
          aria-label="Collapse or expand sidebar"
          title={forced ? "Collapsed on this page" : "Collapse or expand sidebar"}
          className="mb-1 flex min-h-9 w-full items-center gap-3 rounded-md px-[11px] py-2 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100"
        >
          <PanelLeftClose
            size={18}
            className="hidden shrink-0 group-data-[nav=expanded]/nav:block xl:group-data-[nav=auto]/nav:block"
          />
          <PanelLeftOpen
            size={18}
            className="shrink-0 group-data-[nav=expanded]/nav:hidden xl:group-data-[nav=auto]/nav:hidden"
          />
          <span className="hidden truncate group-data-[nav=expanded]/nav:inline xl:group-data-[nav=auto]/nav:inline">
            Collapse
          </span>
        </button>
      </div>

      <nav aria-label="Primary" className="flex-1 px-2">
        <NavList
          sections={main}
          pathname={pathname}
          isCollapsedNow={isCollapsedNow}
          onExpand={expand}
          railOnly={forced}
        />
      </nav>

      <nav aria-label="Help" className="px-2 pt-2">
        <NavList sections={pinned} pathname={pathname} railOnly={forced} />
      </nav>

      <div className="mt-2 border-t border-zinc-200 px-2 pt-2 dark:border-zinc-800">{footer}</div>
    </aside>
  );
}
