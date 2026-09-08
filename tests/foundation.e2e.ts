import { test, expect } from "@playwright/test";
import * as OTPAuth from "otpauth";
test("owner signup → TOTP → settings → real worker dry-run → logout/login, on desktop and phone", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByLabel("Ngôn ngữ").selectOption("en");
  await page.getByLabel("Your name").fill("Dio");
  await page.getByLabel("Business name").fill("Helpa demo seafood");
  await page
    .getByLabel("Setup token")
    .fill("e2e-fixture-bootstrap-0123456789-0123456789");
  await page.getByLabel("Email address").fill("e2e-owner@example.org");
  await page.getByLabel("Password", { exact: true }).fill("e2e-password-123!");
  await page.getByRole("button", { name: "Create owner account" }).click();
  // Persisted user locale defaults to Vietnamese on initial signup.
  await expect(page.getByLabel("Xác nhận mật khẩu")).toBeVisible();
  await page.getByLabel("Ngôn ngữ").selectOption("en");
  await page.getByLabel("Confirm your password").fill("e2e-password-123!");
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/api/auth/two-factor/enable"),
  );
  await page.getByRole("button", { name: "Set up authenticator" }).click();
  const enrollment = await (await response).json();
  const totp = OTPAuth.URI.parse(enrollment.totpURI) as OTPAuth.TOTP;
  await page.getByLabel("I saved my recovery codes").check();
  await page.getByLabel("6-digit authenticator code").fill(totp.generate());
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(
    page.getByRole("button", { name: "Tổng quan", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Ngôn ngữ").selectOption("en");
  await expect(
    page.getByRole("heading", { name: "A clear view of your back office." }),
  ).toBeVisible();
  await page.screenshot({
    path: ".local/helpa-overview-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Provider", { exact: true }).selectOption("openai");
  await page.getByLabel("Monthly cap (USD)").fill("25");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.getByRole("button", { name: "System", exact: true }).click();
  await page
    .getByRole("button", { name: "Verify dry-run", exact: true })
    .click();
  await expect(page.getByText("Would have sent", { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.locator(".operation pre")).toContainText(
    "Helpa dry-run check",
  );
  await expect(page.locator(".operation pre")).toContainText(
    "Asia/Ho_Chi_Minh",
  );
  await page.getByRole("button", { name: "Audit trail", exact: true }).click();
  await expect(
    page.getByText("outbound.would_have_sent", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: ".local/helpa-overview-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Sign out", exact: true })
    .last()
    .click();
  await page.getByLabel("Email address").fill("e2e-owner@example.org");
  await page.getByLabel("Password", { exact: true }).fill("e2e-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("6-digit authenticator code")).toBeVisible();
  await page
    .getByRole("button", { name: "Use a recovery code", exact: true })
    .click();
  await page
    .getByLabel("Recovery code", { exact: true })
    .fill(enrollment.backupCodes[0]);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(
    page.getByRole("heading", { name: "A clear view of your back office." }),
  ).toBeVisible();
  expect(failures).toEqual([]);
});
