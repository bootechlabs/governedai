import { describe, it, expect } from "vitest";
import { duplicateUserMessage, formatInviteError } from "./user-invite";

describe("duplicateUserMessage", () => {
  it("returns a message when a user already exists", () => {
    expect(duplicateUserMessage("a@example.com", { id: "user_1" })).toBe(
      "a@example.com is already a user in your organization",
    );
  });

  it("returns null when there's no existing user", () => {
    expect(duplicateUserMessage("a@example.com", null)).toBeNull();
  });
});

describe("formatInviteError", () => {
  it("includes the email and the underlying Error's message", () => {
    // Same shape as the real failure this covers: Stytch throwing
    // duplicate_member_email when local dev and prod share one project.
    const error = new Error("This email already exists for this organization.");
    expect(formatInviteError("a@example.com", error)).toBe(
      "Couldn't invite a@example.com: This email already exists for this organization.",
    );
  });

  it("falls back to a generic message for a non-Error throw", () => {
    expect(formatInviteError("a@example.com", "some string")).toBe(
      "Couldn't invite a@example.com: Unknown error",
    );
  });
});
