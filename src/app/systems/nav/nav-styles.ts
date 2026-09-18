// Shared by the client nav list and the server-rendered account footer, so it
// is a plain module (a "use client" file would hand a server component
// references instead of strings).
//
// Labels, the chevron, and group children show or hide purely from the
// enclosing `group/nav` element's data-nav value ("collapsed" | "expanded" |
// "auto"; auto = expanded from the xl breakpoint up). The phone drawer wraps
// its content in data-nav="expanded", so it needs no separate code path.
export const showWhenExpanded =
  "group-data-[nav=collapsed]/nav:hidden group-data-[nav=auto]/nav:hidden xl:group-data-[nav=auto]/nav:inline";
export const showBlockWhenExpanded =
  "group-data-[nav=collapsed]/nav:hidden group-data-[nav=auto]/nav:hidden xl:group-data-[nav=auto]/nav:block";

export const rowBase =
  "flex min-h-11 w-full items-center gap-3 rounded-md px-[11px] py-2 text-sm md:min-h-9";
export const rowIdle =
  "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100";
export const rowActive = "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50";
