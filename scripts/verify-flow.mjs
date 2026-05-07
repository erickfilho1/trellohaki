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
    waitUntil: "networkidle",
    timeout: 30000,
  });

  const card = page.locator('[data-card-title="Template: Novo site ou LP"]').first();
  await card.locator('[data-testid^="open-card-"]').click();
  await page.getByText("Comentarios e atividade", { exact: true }).waitFor({ timeout: 15000 });

  await page.getByTestId("card-modal-labels").click();
  await page.getByTestId("label-option-design").click();
  await page.getByTestId("card-modal-labels").click();

  await page.getByTestId("card-modal-dates").click();
  await page.getByTestId("toggle-start-date").click();
  await page.getByTestId("toggle-due-date").click();
  const enabledDateFields = page.locator('input[type="date"]:not([disabled])');
  await enabledDateFields.nth(0).fill("2026-05-05");
  await enabledDateFields.nth(1).fill("2026-05-08");
  await page.locator('input[type="time"]:not([disabled])').fill("14:30");
  await page.getByRole("button", { name: "Salvar" }).last().click();

  await page.getByTestId("card-modal-checklist").click();
  const checklistInput = page.locator('[data-testid^="checklist-input-"]').first();
  await checklistInput.fill("Validar copy final");
  await checklistInput.press("Enter");
  await page.getByText("Validar copy final", { exact: true }).waitFor({ timeout: 10000 });

  await page.getByRole("button", { name: "Escrever um comentario..." }).click();
  await page.getByPlaceholder("Escrever um comentario...").fill("Comentario automatizado de validacao");
  await page.getByTestId("save-comment").click();
  await page.getByText("Comentario automatizado de validacao", { exact: true }).waitFor({ timeout: 10000 });

  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);

  await ensure((await card.locator("text=Design").count()) > 0, "Etiqueta Design nao apareceu no card.");
  await ensure((await card.locator("text=0/1").count()) > 0, "Resumo de checklist nao apareceu no card.");
  await ensure((await card.locator("text=2").count()) > 0, "Resumo de comentarios nao apareceu no card.");

  await page.getByTestId("share-board-primary").click();
  await page.getByText("Compartilhar quadro", { exact: true }).waitFor({ timeout: 10000 });
  await page.getByTestId("create-share-link").click();
  await page.getByTestId("copy-share-link").waitFor({ timeout: 10000 });
  await page.getByTestId("copy-share-link").click();
  await page.keyboard.press("Escape");

  console.log("FLOW_OK");
} finally {
  await browser.close();
}
