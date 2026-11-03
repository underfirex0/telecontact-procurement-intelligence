/**
 * End-to-end user journeys (Playwright). Requires the app running:
 *   npm run build && npm start   (or npm run dev)
 *   BASE_URL=http://localhost:3000 npm run test:e2e
 * Exits non-zero on the first failed step or on any uncaught page error.
 */
import { createRequire } from "node:module";

// Resolved via require so a globally installed Playwright (NODE_PATH) also works.
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
let n = 0;
async function step(name, fn) {
  n++;
  try {
    await fn();
    if (errors.length) throw new Error(errors.join("\n"));
    console.log(`  ✓ ${n}. ${name}`);
  } catch (e) {
    console.error(`  ✗ ${n}. ${name}\n    ${String(e).split("\n").slice(0, 4).join("\n    ")}`);
    await page.screenshot({ path: `e2e-failure-${n}.png` }).catch(() => {});
    await browser.close();
    process.exit(1);
  }
}
const go = (p) => page.goto(BASE + p, { waitUntil: "networkidle" });
const see = (text) => page.getByText(text, { exact: false }).first().waitFor({ timeout: 15000 });

console.log(`Telecontact Intelligence — user journeys against ${BASE}`);

await step("Explore the intelligence overview", async () => {
  await go("/");
  await see("Moroccan public procurement — market brief");
  await see("Live pipeline");
  await page.getByLabel("Sector").selectOption({ label: "Cleaning & maintenance" });
  await see("Market activity");
});

await step("Search for an opportunity (global search)", async () => {
  await page.getByLabel("Global search").fill("nettoyage");
  await page.locator("button:has-text('Opportunity')").first().waitFor();
  await page.getByLabel("Global search").press("Enter"); // Enter opens the highlighted hit
  await page.waitForURL(/\/opportunities\/OPP-/);
  await see("Strategic verdict");
});

await step("Apply filters on the opportunity database", async () => {
  await go("/opportunities");
  await page.getByRole("button", { name: /^Active/ }).click();
  await page.getByLabel("Sector").selectOption({ label: "Infrastructure" });
  await page.waitForSelector("tbody tr");
  await page.getByRole("button", { name: /Est\. value/i }).click();
});

await step("Open an opportunity dossier and save it", async () => {
  await page.locator("tbody tr a[href^='/opportunities/OPP-']").first().click();
  await see("Strategic verdict");
  await see("Evidence ledger");
  await page.getByRole("button", { name: "Save opportunity" }).click();
  await see("Saved");
});

await step("Complete a bid assessment", async () => {
  await page.getByRole("link", { name: /bid assessment/i }).first().click();
  await see("Team scoring");
  await page.getByRole("button", { name: "Bid", exact: true }).click();
  await see("Assessment saved");
  await go("/bids");
  await see("Opportunities in evaluation");
  await page.locator("tbody tr").first().waitFor();
});

await step("Open a buyer profile and compare buyers", async () => {
  await go("/buyers");
  await page.locator("tbody tr a[href^='/buyers/B']").first().click();
  await see("Purchasing calendar");
  await go("/buyers/compare?ids=B001,B003");
  await see("Key metrics");
});

await step("Open a competitor and inspect award history", async () => {
  await go("/competitors");
  await page.getByRole("button", { name: /Verified awardee/ }).click();
  await page.locator("tbody tr a[href^='/competitors/C']").first().click();
  await see("Award history");
  await see("Recorded participation");
  await go("/awardees");
  await see("Sector dominance");
});

await step("Analyse market trends", async () => {
  await go("/market");
  await see("Procurement demand over time");
  await page.getByRole("tab", { name: "Competition & concentration" }).click();
  await see("Award concentration");
  await page.getByRole("tab", { name: "Period comparison" }).click();
  await see("Compare two periods");
});

await step("Open a future procurement signal", async () => {
  await go("/signals");
  await page.locator("main button.grid").first().click();
  await see("Supporting evidence");
  await see("Confidence components");
});

await step("Explore suppliers and create a provider record", async () => {
  await go("/suppliers");
  await see("Network footprint");
  await page.getByRole("button", { name: "New supplier" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.locator("label:has-text('Company name') input").fill("E2E Demo Solar Partner SARL");
  await dlg.getByRole("button", { name: "Renewable energy" }).click();
  await dlg.locator("label:has-text('Email') input").first().fill("contact@e2e-demo.example");
  await dlg.getByRole("button", { name: "Create supplier" }).click();
  await page.waitForURL(/\/suppliers\/SUP-/);
  await see("E2E Demo Solar Partner SARL");
});

await step("Schedule a simulated meeting", async () => {
  await page.getByRole("button", { name: "Schedule meeting" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Schedule" }).click();
  await see("Meeting scheduled for");
  await see("Introductory capability meeting");
});

await step("Register a provider through the onboarding form", async () => {
  await go("/acquisition?tab=onboarding");
  await page.locator("label:has-text('Company name') input").fill("E2E Registered Provider SAS");
  await page.getByRole("button", { name: "Training" }).click();
  await page.locator("label:has-text('Main contact') input").fill("Demo Contact");
  await page.locator("label:has-text('Email') input").fill("demo@e2e-provider.example");
  await page.locator("label:has-text('I understand') input").check();
  await page.getByRole("button", { name: "Submit registration" }).click();
  await see("Registration received");
});

await step("Generate and export a report", async () => {
  await go("/reports?type=market");
  await see("Executive summary");
  await page.getByRole("button", { name: "Generate report" }).click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Excel" }).click()]);
  if (!dl.suggestedFilename().endsWith(".xls")) throw new Error("unexpected export " + dl.suggestedFilename());
  const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "CSV" }).first().click()]);
  if (!csv.suggestedFilename().endsWith(".csv")) throw new Error("unexpected csv " + csv.suggestedFilename());
});

await step("Data quality workspace", async () => {
  await go("/quality");
  await see("Overall score");
  await see("Issue log");
});

await browser.close();
console.log(`All ${n} journeys passed.`);
