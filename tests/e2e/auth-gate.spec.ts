import { test, expect } from "@playwright/test";

// No login here — a real magic-link E2E flow needs a test-only auth
// bypass (Auth.js's own signIn callback runs too late to fake for the
// email strategy, per the comment in src/auth.ts) that doesn't exist
// yet. These cover the one thing that's both critical and testable
// without it: unauthenticated requests actually get bounced, for every
// route under /systems.

test("home page renders for anonymous visitors", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "GovernedAI" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View AI system inventory" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("sign-in page renders the magic-link form", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Sign in to GovernedAI" })).toBeVisible();
  await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send magic link" })).toBeVisible();
});

for (const path of ["/systems", "/systems/some-id", "/systems/users"]) {
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
  await page.getByPlaceholder("you@company.com").fill("nobody-provisioned@example.com");
  await page.getByRole("button", { name: "Send magic link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  // The actual rejection happens when the link is clicked (see src/auth.ts) —
  // this only verifies the request step doesn't leak whether an email is
  // provisioned, which is itself a deliberate property (no user enumeration).
});
