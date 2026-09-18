"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { X } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { visibleNav } from "@/lib/nav";
import { useNav } from "./nav-provider";
import { NavList } from "./nav-list";

// Slide-over navigation for phones (below md). Always shows labels, has
// touch-sized rows, and traps focus by making the rest of the app inert while
// open — the layout marks the top bar and <main> with data-nav-inert.
export function MobileDrawer({ role, footer }: { role: UserRole; footer: React.ReactNode }) {
  const { drawerOpen, setDrawerOpen } = useNav();
  const pathname = usePathname();
  const sections = useMemo(() => visibleNav(role), [role]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;

    const inertTargets = document.querySelectorAll<HTMLElement>("[data-nav-inert]");
    inertTargets.forEach((el) => el.setAttribute("inert", ""));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    // Growing past the phone breakpoint hides the drawer; don't leave the app
    // inert and scroll-locked behind it.
    const desktop = window.matchMedia("(min-width: 768px)");
    const onResize = (event: MediaQueryListEvent) => {
      if (event.matches) setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onResize);

    return () => {
      inertTargets.forEach((el) => el.removeAttribute("inert"));
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onResize);
    };
  }, [drawerOpen, setDrawerOpen]);

  const close = () => setDrawerOpen(false);

  return (
    <div className="md:hidden">
      <div
        aria-hidden="true"
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        id="mobile-nav"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        tabIndex={-1}
        inert={!drawerOpen}
        data-nav="expanded"
        className={`group/nav fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-zinc-200 bg-background py-2 shadow-xl outline-none transition-transform duration-200 dark:border-zinc-800 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-1">
          <span className="text-sm font-medium">Menu</span>
          <button
            type="button"
            onClick={close}
            aria-label="Close navigation"
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X size={20} />
          </button>
        </div>
        <nav aria-label="Primary" className="flex-1 px-2">
          <NavList sections={sections.slice(0, -1)} pathname={pathname} onNavigate={close} />
        </nav>
        <nav aria-label="Help" className="px-2 pt-2">
          <NavList sections={sections.slice(-1)} pathname={pathname} onNavigate={close} />
        </nav>
        {/* The footer is server-rendered, so its profile link can't take an
            onClick; close on any link click inside it instead. */}
        <div
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) close();
          }}
          className="mt-2 border-t border-zinc-200 px-2 pt-2 dark:border-zinc-800"
        >
          {footer}
        </div>
      </div>
    </div>
  );
}
