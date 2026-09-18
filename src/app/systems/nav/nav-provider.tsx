"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { NAV_COOKIE, type NavPref } from "@/lib/nav";

interface NavContextValue {
  pref: NavPref;
  // Flip between collapsed and expanded, from whatever is currently showing.
  toggle: () => void;
  expand: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const NavContext = createContext<NavContextValue | null>(null);

export function useNav(): NavContextValue {
  const value = useContext(NavContext);
  if (!value) throw new Error("useNav must be used inside <NavProvider>");
  return value;
}

function persist(pref: Exclude<NavPref, "auto">) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${NAV_COOKIE}=${pref}; path=/; max-age=31536000; SameSite=Lax${secure}`;
}

// The rail-vs-labels choice is desktop-only; the phone drawer has its own
// open state and never persists anything.
export function NavProvider({ initialPref, children }: { initialPref: NavPref; children: ReactNode }) {
  const [pref, setPref] = useState<NavPref>(initialPref);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const choose = useCallback((next: Exclude<NavPref, "auto">) => {
    setPref(next);
    persist(next);
  }, []);

  const toggle = useCallback(() => {
    // In "auto" the effective state is a CSS breakpoint, so ask the browser.
    const showingExpanded =
      pref === "auto" ? window.matchMedia("(min-width: 1280px)").matches : pref === "expanded";
    choose(showingExpanded ? "collapsed" : "expanded");
  }, [pref, choose]);

  const expand = useCallback(() => choose("expanded"), [choose]);

  const value = useMemo(
    () => ({ pref, toggle, expand, drawerOpen, setDrawerOpen }),
    [pref, toggle, expand, drawerOpen],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}
