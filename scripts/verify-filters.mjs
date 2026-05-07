import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 980 } });

async function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  await page.goto("http://localhost:3000/boards/board-hub", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  const templateCard = page.locator('[data-card-title="Template: Novo site ou LP"]').first();
  const maintenanceCard = page.locator('[data-card-title="Manutencao"]').first();
  const welcomeCard = page.locator('[data-card-title="Seja bem-vindo ao painel de design"]').first();

  await ensure((await templateCard.count()) > 0, "Card Template nao apareceu no board.");
  await ensure((await maintenanceCard.count()) > 0, "Card Manutencao nao apareceu no board.");

  await page.getByTestId("open-filter-panel").click();
  const filterPanel = page.locator("aside").filter({ has: page.getByRole("heading", { name: "Filtro" }) });
  await filterPanel.waitFor({ timeout: 10000 });

  await page.getByPlaceholder("Insira uma palavra-chave...").fill("Template");
  await page.waitForTimeout(400);

  await ensure((await templateCard.count()) > 0, "Card Template sumiu com filtro de palavra-chave.");
  await ensure((await maintenanceCard.count()) === 0, "Filtro por palavra-chave nao escondeu Manutencao.");

  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await page.waitForTimeout(400);
  await ensure((await maintenanceCard.count()) > 0, "Limpar filtros nao restaurou os cards.");

  await filterPanel.getByLabel("Design").check();
  await page.waitForTimeout(400);

  await ensure((await welcomeCard.count()) > 0, "Filtro por etiqueta Design nao manteve o card correto.");
  await ensure((await templateCard.count()) === 0, "Filtro por etiqueta Design nao ocultou o card Template.");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await ensure((await filterPanel.count()) === 0, "Painel de filtro nao fechou com ESC.");

  console.log("FILTER_OK");
} finally {
  await browser.close();
}
