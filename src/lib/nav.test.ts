import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import { NAV_SECTIONS, visibleNav, isNavActive, forcesCollapsedNav, type NavItem } from "./nav";

function flatten(sections: NavItem[][]): NavItem[] {
  return sections.flat().flatMap((item) => [item, ...(item.children ?? [])]);
}
const labels = (role: "ADMIN" | "REVIEWER" | "CONTRIBUTOR") => flatten(visibleNav(role)).map((i) => i.label);
const find = (id: string) => flatten(NAV_SECTIONS).find((i) => i.id === id)!;

describe("visibleNav", () => {
  it("shows an admin everything", () => {
    expect(labels("ADMIN")).toEqual(
      expect.arrayContaining(["Vendors", "Users", "SSO", "API", "API keys", "API docs", "OpenAPI reference", "Logs", "Activity log"]),
    );
  });

  it.each(["REVIEWER", "CONTRIBUTOR"] as const)("hides admin-only items from a %s", (role) => {
    const shown = labels(role);
    for (const hidden of ["Vendors", "Users", "SSO", "API keys"]) expect(shown).not.toContain(hidden);
  });

  it.each(["REVIEWER", "CONTRIBUTOR"] as const)(
    "still gives a %s the API docs, the reference, and the activity log",
    (role) => {
      const shown = labels(role);
      for (const visible of ["Dashboard", "Inventory", "API", "API docs", "OpenAPI reference", "Logs", "Activity log", "Regulatory updates", "Legend"]) {
        expect(shown).toContain(visible);
      }
    },
  );

  it("drops a section (and its divider) when nothing in it is visible", () => {
    // Users + SSO are the only items in their section, both admin-only.
    const ids = visibleNav("CONTRIBUTOR").map((section) => section.map((i) => i.id));
    expect(ids.flat()).not.toContain("users");
    expect(ids.every((section) => section.length > 0)).toBe(true);
  });

  it("marks every item that hides itself from non-admins as adminOnly, so the Legend can say so", () => {
    for (const item of flatten(NAV_SECTIONS)) {
      if (item.visible) {
        expect(item.adminOnly, item.id).toBe(true);
      }
    }
  });
});

describe("nav definition integrity", () => {
  const items = flatten(NAV_SECTIONS);

  it("has unique ids and unique hrefs", () => {
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const hrefs = items.filter((i) => i.href).map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("gives every item exactly one of href or children", () => {
    for (const item of items) expect(!!item.href !== !!item.children, item.id).toBe(true);
  });

  // Catches a typo'd or renamed route before it ships as a dead nav link.
  it("links only to pages that exist", () => {
    for (const item of items.filter((i) => i.href)) {
      const page = join(process.cwd(), "src/app", item.href!, "page.tsx");
      expect(existsSync(page), `${item.id} -> ${item.href}`).toBe(true);
    }
  });
});

describe("isNavActive", () => {
  it("matches the dashboard only on /systems exactly", () => {
    expect(isNavActive(find("dashboard"), "/systems")).toBe(true);
    expect(isNavActive(find("dashboard"), "/systems/inventory")).toBe(false);
  });

  it("highlights Inventory for its own pages, system-detail pages, and pages launched from it", () => {
    const inventory = find("inventory");
    expect(isNavActive(inventory, "/systems/inventory")).toBe(true);
    expect(isNavActive(inventory, "/systems/cmu79erni0007q007vvvooai6")).toBe(true);
    expect(isNavActive(inventory, "/systems/cmu79erni0007q007vvvooai6/risk-assessment")).toBe(true);
    expect(isNavActive(inventory, "/systems/import")).toBe(true);
    expect(isNavActive(inventory, "/systems/portfolio-report")).toBe(true);
  });

  it("does not highlight Inventory on other top-level pages", () => {
    const inventory = find("inventory");
    for (const path of ["/systems", "/systems/vendors", "/systems/activity", "/systems/updates", "/systems/users", "/systems/api-keys/docs", "/systems/legend"]) {
      expect(isNavActive(inventory, path), path).toBe(false);
    }
  });

  it("keeps the three API pages from matching each other", () => {
    const keys = find("api-keys");
    const docs = find("api-docs");
    const reference = find("api-reference");
    expect(isNavActive(keys, "/systems/api-keys")).toBe(true);
    expect(isNavActive(keys, "/systems/api-keys/docs")).toBe(false);
    expect(isNavActive(docs, "/systems/api-keys/docs")).toBe(true);
    expect(isNavActive(docs, "/systems/api-keys/docs/reference")).toBe(false);
    expect(isNavActive(reference, "/systems/api-keys/docs/reference")).toBe(true);
  });

  it("lights Regulatory updates on its list and detail pages, not Inventory", () => {
    const updates = find("updates");
    expect(isNavActive(updates, "/systems/updates")).toBe(true);
    expect(isNavActive(updates, "/systems/updates/abc123")).toBe(true);
    expect(isNavActive(find("inventory"), "/systems/updates/abc123")).toBe(false);
  });

  it("lights a group when any child is active", () => {
    expect(isNavActive(find("api"), "/systems/api-keys/docs/reference")).toBe(true);
    expect(isNavActive(find("logs"), "/systems/activity")).toBe(true);
    expect(isNavActive(find("logs"), "/systems/users")).toBe(false);
  });
});

describe("forcesCollapsedNav", () => {
  it("only applies to the OpenAPI reference, which has its own sidebar", () => {
    expect(forcesCollapsedNav("/systems/api-keys/docs/reference")).toBe(true);
    expect(forcesCollapsedNav("/systems/api-keys/docs")).toBe(false);
    expect(forcesCollapsedNav("/systems")).toBe(false);
  });
});

describe("parseNavPref", () => {
  it("accepts only the two explicit values, everything else is auto", async () => {
    const { parseNavPref } = await import("./nav");
    expect(parseNavPref("collapsed")).toBe("collapsed");
    expect(parseNavPref("expanded")).toBe("expanded");
    for (const raw of [undefined, null, "", "auto", "COLLAPSED", "true", "<script>"]) {
      expect(parseNavPref(raw), String(raw)).toBe("auto");
    }
  });
});
