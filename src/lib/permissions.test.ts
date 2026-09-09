import { describe, it, expect } from "vitest";
import {
  canCreateSystem,
  canManageSystem,
  canDecideStage,
  canManageUsers,
} from "./permissions";
import type { UserRole } from "@prisma/client";

const ALL_ROLES: UserRole[] = ["ADMIN", "REVIEWER", "CONTRIBUTOR"];

describe("canCreateSystem", () => {
  it("allows ADMIN and CONTRIBUTOR", () => {
    expect(canCreateSystem("ADMIN")).toBe(true);
    expect(canCreateSystem("CONTRIBUTOR")).toBe(true);
  });

  it("denies REVIEWER", () => {
    expect(canCreateSystem("REVIEWER")).toBe(false);
  });
});

describe("canManageSystem (edit/delete/archive)", () => {
  it("allows only ADMIN", () => {
    expect(canManageSystem("ADMIN")).toBe(true);
    expect(canManageSystem("REVIEWER")).toBe(false);
    expect(canManageSystem("CONTRIBUTOR")).toBe(false);
  });
});

describe("canDecideStage", () => {
  it("allows ADMIN and REVIEWER", () => {
    expect(canDecideStage("ADMIN")).toBe(true);
    expect(canDecideStage("REVIEWER")).toBe(true);
  });

  it("denies CONTRIBUTOR", () => {
    expect(canDecideStage("CONTRIBUTOR")).toBe(false);
  });
});

describe("canManageUsers", () => {
  it("allows only ADMIN", () => {
    expect(canManageUsers("ADMIN")).toBe(true);
    expect(canManageUsers("REVIEWER")).toBe(false);
    expect(canManageUsers("CONTRIBUTOR")).toBe(false);
  });
});

describe("segregation of duties", () => {
  it("no non-admin role can both create and decide — the whole point of the split", () => {
    for (const role of ALL_ROLES) {
      if (role === "ADMIN") continue;
      const canBoth = canCreateSystem(role) && canDecideStage(role);
      expect(canBoth).toBe(false);
    }
  });
});
