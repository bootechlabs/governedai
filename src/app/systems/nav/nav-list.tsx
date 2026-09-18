"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { isNavActive, type NavItem } from "@/lib/nav";

// Labels, the chevron, and group children show or hide purely from the
// enclosing `group/nav` element's data-nav value ("collapsed" | "expanded" |
// "auto"; auto = expanded from the xl breakpoint up). The phone drawer wraps
// this in data-nav="expanded", so it needs no separate code path.
const showWhenExpanded =
  "group-data-[nav=collapsed]/nav:hidden group-data-[nav=auto]/nav:hidden xl:group-data-[nav=auto]/nav:inline";
const showBlockWhenExpanded =
  "group-data-[nav=collapsed]/nav:hidden group-data-[nav=auto]/nav:hidden xl:group-data-[nav=auto]/nav:block";

const rowBase =
  "flex min-h-11 w-full items-center gap-3 rounded-md px-[11px] py-2 text-sm md:min-h-9";
const rowIdle =
  "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100";
const rowActive = "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50";

function ItemLink({
  item,
  active,
  child,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  child?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href!}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      title={item.label}
      onClick={onNavigate}
      className={`${rowBase} ${active ? rowActive : rowIdle}`}
    >
      <Icon size={child ? 16 : 18} className="shrink-0" />
      <span className={`truncate ${showWhenExpanded}`}>{item.label}</span>
    </Link>
  );
}

export function NavList({
  sections,
  pathname,
  onNavigate,
  isCollapsedNow,
  onExpand,
  railOnly = false,
}: {
  sections: NavItem[][];
  pathname: string;
  onNavigate?: () => void;
  // Sidebar only: is the rail (icons only) showing right now? A group can't
  // open in a rail, so pressing one expands the sidebar first.
  isCollapsedNow?: () => boolean;
  onExpand?: () => void;
  // The sidebar is stuck collapsed on this page, so a group icon can only
  // take you to its first page.
  railOnly?: boolean;
}) {
  const [manuallyOpen, setManuallyOpen] = useState<Record<string, boolean>>({});

  function renderItem(item: NavItem) {
    const active = isNavActive(item, pathname);

    if (!item.children) {
      return (
        <li key={item.id}>
          <ItemLink item={item} active={active} onNavigate={onNavigate} />
        </li>
      );
    }

    const Icon = item.icon;
    const open = manuallyOpen[item.id] ?? active;

    if (railOnly) {
      return (
        <li key={item.id}>
          <Link
            href={item.children[0].href!}
            aria-label={item.label}
            title={item.label}
            onClick={onNavigate}
            className={`${rowBase} ${active ? rowActive : rowIdle}`}
          >
            <Icon size={18} className="shrink-0" />
          </Link>
        </li>
      );
    }

    return (
      <li key={item.id}>
        <button
          type="button"
          aria-label={item.label}
          title={item.label}
          aria-expanded={open}
          onClick={() => {
            if (isCollapsedNow?.()) {
              onExpand?.();
              setManuallyOpen((s) => ({ ...s, [item.id]: true }));
            } else {
              setManuallyOpen((s) => ({ ...s, [item.id]: !open }));
            }
          }}
          className={`${rowBase} ${active ? "font-medium text-zinc-900 dark:text-zinc-50" : rowIdle}`}
        >
          <Icon size={18} className="shrink-0" />
          <span className={`flex-1 truncate text-left ${showWhenExpanded}`}>{item.label}</span>
          <ChevronDown
            size={14}
            className={`shrink-0 transition-transform ${open ? "rotate-180" : ""} ${showWhenExpanded}`}
          />
        </button>
        {open && (
          <ul className={`mt-0.5 flex flex-col gap-0.5 pl-3 ${showBlockWhenExpanded}`}>
            {item.children.map((child) => (
              <li key={child.id}>
                <ItemLink
                  item={child}
                  child
                  active={isNavActive(child, pathname)}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div className="flex flex-col">
      {sections.map((section, index) => (
        <div
          key={index}
          className={index > 0 ? "mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-800" : ""}
        >
          <ul className="flex flex-col gap-0.5">{section.map(renderItem)}</ul>
        </div>
      ))}
    </div>
  );
}
