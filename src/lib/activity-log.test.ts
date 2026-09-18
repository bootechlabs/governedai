import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// Only the pure helpers are exercised here; listActivity's query is checked
// against a real database separately.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const {
  AUDIT_ACTION_LABELS,
  auditActionLabel,
  parseActivityParams,
  pageCount,
  clampPage,
  formatUtc,
  ACTIVITY_PAGE_SIZE,
} = await import("./activity-log");

describe("auditActionLabel", () => {
  it("uses the human label for a known action", () => {
    expect(auditActionLabel("stage_transitioned")).toBe("Workflow decision recorded");
  });

  it("never returns an inherited Object.prototype member", () => {
    expect(auditActionLabel("toString")).toBe("ToString");
    expect(auditActionLabel("constructor")).toBe("Constructor");
  });

  it("humanizes an unknown action instead of showing the raw string", () => {
    expect(auditActionLabel("some_new_action")).toBe("Some new action");
  });
});

describe("parseActivityParams", () => {
  it("defaults to page 1 with no filters", () => {
    expect(parseActivityParams({})).toEqual({ page: 1, action: null, systemId: null });
  });

  it("rejects bad page numbers", () => {
    for (const page of ["0", "-3", "abc", "1.5x", ""]) {
      const parsed = parseActivityParams({ page }).page;
      expect(parsed, page).toBeGreaterThanOrEqual(1);
    }
    expect(parseActivityParams({ page: "abc" }).page).toBe(1);
    expect(parseActivityParams({ page: "0" }).page).toBe(1);
    expect(parseActivityParams({ page: "3" }).page).toBe(3);
  });

  it("only accepts a known action", () => {
    expect(parseActivityParams({ action: "system_created" }).action).toBe("system_created");
    expect(parseActivityParams({ action: "'; DROP TABLE" }).action).toBeNull();
    expect(parseActivityParams({ action: "toString" }).action).toBeNull();
  });

  it("trims the system filter and treats blank as none", () => {
    expect(parseActivityParams({ system: "  abc123 " }).systemId).toBe("abc123");
    expect(parseActivityParams({ system: "   " }).systemId).toBeNull();
  });
});

describe("pagination", () => {
  it("always has at least one page", () => {
    expect(pageCount(0)).toBe(1);
  });

  it("rounds up at the page boundary", () => {
    expect(pageCount(ACTIVITY_PAGE_SIZE)).toBe(1);
    expect(pageCount(ACTIVITY_PAGE_SIZE + 1)).toBe(2);
    expect(pageCount(ACTIVITY_PAGE_SIZE * 3)).toBe(3);
  });

  it("clamps a page past the end (e.g. filters removed rows since the link was made)", () => {
    expect(clampPage(99, ACTIVITY_PAGE_SIZE * 2)).toBe(2);
    expect(clampPage(0, 10)).toBe(1);
    expect(clampPage(5, 0)).toBe(1);
  });
});

describe("formatUtc", () => {
  it("formats to the minute and labels the zone", () => {
    expect(formatUtc(new Date("2026-09-18T13:04:59.999Z"))).toBe("2026-09-18 13:04 UTC");
  });
});

// A new logAuditEntry action with no label would silently be missing from the
// Activity log's filter dropdown, so fail the build instead.
describe("every logged action has a label", () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
    });
  }

  it("covers all action strings passed to logAuditEntry in src/", () => {
    const actions = new Set<string>();
    for (const file of sourceFiles(join(process.cwd(), "src"))) {
      const text = readFileSync(file, "utf8");
      if (!text.includes("logAuditEntry(")) continue;
      for (const match of text.matchAll(/action: "([a-z_]+)"/g)) actions.add(match[1]);
    }

    expect(actions.size).toBeGreaterThan(0);
    for (const action of actions) {
      expect(AUDIT_ACTION_LABELS, `missing label for "${action}"`).toHaveProperty(action);
    }
  });

  it("has no stale labels for actions that are never logged", () => {
    const logged = new Set<string>();
    for (const file of sourceFiles(join(process.cwd(), "src"))) {
      const text = readFileSync(file, "utf8");
      if (!text.includes("logAuditEntry(")) continue;
      for (const match of text.matchAll(/action: "([a-z_]+)"/g)) logged.add(match[1]);
    }
    for (const action of Object.keys(AUDIT_ACTION_LABELS)) {
      expect(logged, `label for "${action}" but nothing logs it`).toContain(action);
    }
  });
});
