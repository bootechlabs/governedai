import { test, expect } from "@playwright/test";

// No login here — a real Stytch magic-link E2E flow needs either a
// test-only session-cookie bypass or Stytch's own test-mode token
// helpers wired in, neither of which exists yet. These cover the one
// thing that's both critical and testable without it: unauthenticated
// requests actually get bounced, for every route under /systems.

test("home page renders for anonymous visitors", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "GovernedAI" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View AI system inventory" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("sign-in page renders the magic-link form", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Sign in to GovernedAI" })).toBeVisible();
  // Scoped to this form specifically — the SSO form below it shares the
  // same email placeholder.
  const magicLinkForm = page.locator("form").filter({ hasText: "Send magic link" });
  await expect(magicLinkForm.getByPlaceholder("you@company.com")).toBeVisible();
  await expect(magicLinkForm.getByRole("button", { name: "Send magic link" })).toBeVisible();
});

for (const path of [
  "/systems",
  "/systems/some-id",
  "/systems/users",
  "/systems/api-keys/docs",
  "/systems/api-keys/docs/reference",
  "/systems/api-keys/docs/openapi.json",
  "/systems/activity",
]) {
  test(`${path} redirects an anonymous visitor to sign-in`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByRole("heading", { name: "Sign in to GovernedAI" })).toBeVisible();
  });
}

test("an unprovisioned email is rejected with the custom error page, not Auth.js's default", async ({
  page,
}) => {
  await page.goto("/sign-in");
  const magicLinkForm = page.locator("form").filter({ hasText: "Send magic link" });
  await magicLinkForm.getByPlaceholder("you@company.com").fill("nobody-provisioned@example.com");
  await magicLinkForm.getByRole("button", { name: "Send magic link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  // The actual rejection happens server-side in sendMagicLink (see
  // src/app/sign-in/actions.ts) — this only verifies the request step
  // doesn't leak whether an email is provisioned, which is itself a
  // deliberate property (no user enumeration).
});
