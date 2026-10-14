import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const url = process.env.PIPELINE_STATUS_TEST_URL;
const root = process.env.PIPELINE_STATUS_TEST_ROOT;

test("Today Skip reports failure and only disappears after a durable save", { skip: !url || !root, timeout: 120_000 }, async (t) => {
  assert.equal(fs.readFileSync(path.join(root, ".inline-status-fixture"), "utf8").trim(), "fictional-only");
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(url).hostname));
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const tracker = path.join(root, "data/applications.md");
  const initial = fs.readFileSync(tracker, "utf8");
  const card = () => page.locator("div").filter({ has: page.getByRole("link", { name: "Review decision", exact: true }) }).filter({ hasText: "Fixture Alpha" }).last();
  await page.goto(url);
  await card().getByRole("button", { name: "Skip", exact: true }).waitFor();
  await page.route("**/api/status", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Fixture save failed. Try again." }) }));
  await card().getByRole("button", { name: "Skip", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Fixture save failed" }).waitFor({ timeout: 5000 });
  assert.equal(await card().getByRole("button", { name: "Skip", exact: true }).isVisible(), true);
  assert.equal(fs.readFileSync(tracker, "utf8"), initial);
  await page.unroute("**/api/status");
  await card().getByRole("button", { name: "Skip", exact: true }).click();
  await page.getByText("Fixture Alpha", { exact: true }).waitFor({ state: "hidden" });
  assert.match(fs.readFileSync(tracker, "utf8"), /Fixture Alpha.*Discarded/);
  await page.reload();
  await page.getByText("Fixture Gamma", { exact: true }).waitFor();
  assert.equal(await page.getByText("Fixture Alpha", { exact: true }).count(), 0);
});
