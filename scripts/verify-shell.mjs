import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 940 } });

async function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  await page.goto("http://localhost:3000", {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  await page.getByText("Portal do cliente", { exact: true }).waitFor({ timeout: 15000 });

  await page.getByTestId("sidebar-toggle").click();
  await page.waitForTimeout(300);
  const collapsedWidth = await page.locator('[data-testid="client-sidebar"]').evaluate((node) => node.getBoundingClientRect().width);
  await assert(collapsedWidth < 90, "Sidebar nao recolheu para o modo compacto.");

  await page.getByTestId("sidebar-link-projetos-entregues").click();
  await page.getByText("Projetos entregues", { exact: true }).waitFor({ timeout: 10000 });

  await page.getByTestId("sidebar-link-configuracoes").click();
  await page.getByText("Configuracoes", { exact: true }).waitFor({ timeout: 10000 });

  await page.getByTestId("sidebar-link-quadro").click();
  await page.getByText("Portal do cliente", { exact: true }).waitFor({ timeout: 10000 });
  await page.locator('[data-card-title="Template: Novo site ou LP"]').waitFor({ timeout: 10000 });

  console.log("SHELL_OK");
} finally {
  await browser.close();
}
