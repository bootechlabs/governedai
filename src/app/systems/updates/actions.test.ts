import { describe, it, expect, vi, beforeEach } from "vitest";

let role: "ADMIN" | "REVIEWER" | "CONTRIBUTOR" = "ADMIN";
vi.mock("@/lib/current-user", () => ({
  getCurrentUser: async () => ({ id: "user_1", organizationId: "org_session", role }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const recordRegulatoryReview = vi.fn(async () => ({ auditedSystemCount: 1 }));
const flagAffectedForRecertification = vi.fn(async () => ({ flaggedSystemCount: 1 }));
vi.mock("@/lib/regulatory-updates-db", () => ({ recordRegulatoryReview, flagAffectedForRecertification }));

const { submitRegulatoryReview, flagUpdateForRecertification } = await import("./actions");

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

beforeEach(() => {
  role = "ADMIN";
  vi.clearAllMocks();
});

describe("submitRegulatoryReview", () => {
  it.each(["ADMIN", "REVIEWER"] as const)("lets a %s record a review", async (r) => {
    role = r;
    await submitRegulatoryReview("u1", form({ outcome: "NO_ACTION_NEEDED", note: "ok" }));
    expect(recordRegulatoryReview).toHaveBeenCalledWith({
      organizationId: "org_session",
      actorId: "user_1",
      updateId: "u1",
      outcome: "NO_ACTION_NEEDED",
      note: "ok",
    });
  });

  it("refuses a CONTRIBUTOR", async () => {
    role = "CONTRIBUTOR";
    await expect(submitRegulatoryReview("u1", form({ outcome: "NO_ACTION_NEEDED" }))).rejects.toThrow("can't record");
    expect(recordRegulatoryReview).not.toHaveBeenCalled();
  });

  it("takes the organization from the session, ignoring anything in the form", async () => {
    await submitRegulatoryReview("u1", form({ outcome: "NO_ACTION_NEEDED", organizationId: "org_evil" }));
    expect(recordRegulatoryReview).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org_session" }));
  });

  it("rejects a missing or invalid outcome", async () => {
    await expect(submitRegulatoryReview("u1", form({}))).rejects.toThrow("outcome");
    await expect(submitRegulatoryReview("u1", form({ outcome: "SHRUG" }))).rejects.toThrow("outcome");
    expect(recordRegulatoryReview).not.toHaveBeenCalled();
  });
});

describe("flagUpdateForRecertification", () => {
  it("is admin only", async () => {
    await flagUpdateForRecertification("u1");
    expect(flagAffectedForRecertification).toHaveBeenCalledWith({
      organizationId: "org_session",
      actorId: "user_1",
      updateId: "u1",
    });

    for (const r of ["REVIEWER", "CONTRIBUTOR"] as const) {
      role = r;
      await expect(flagUpdateForRecertification("u1")).rejects.toThrow("Only admins");
    }
    expect(flagAffectedForRecertification).toHaveBeenCalledTimes(1);
  });
});
