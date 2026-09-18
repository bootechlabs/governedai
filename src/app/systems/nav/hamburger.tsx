"use client";

import { useEffect, useRef } from "react";
import { Menu } from "lucide-react";
import { useNav } from "./nav-provider";

// Phone-only trigger in the top bar (the sidebar takes over from md up).
export function Hamburger() {
  const { drawerOpen, setDrawerOpen } = useNav();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Hand focus back to the trigger when the drawer closes.
  useEffect(() => {
    if (wasOpen.current && !drawerOpen) buttonRef.current?.focus();
    wasOpen.current = drawerOpen;
  }, [drawerOpen]);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => setDrawerOpen(true)}
      aria-label="Open navigation"
      aria-expanded={drawerOpen}
      aria-controls="mobile-nav"
      className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-800"
    >
      <Menu size={20} />
    </button>
  );
}
