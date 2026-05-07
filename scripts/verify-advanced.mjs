import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1560, height: 980 } });

async function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  await page.goto("http://localhost:3000", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  await page.locator('[data-card-title="Template: Novo site ou LP"]').locator('[data-testid^="open-card-"]').click();
  await page.getByText("Comentarios e atividade", { exact: true }).waitFor({ timeout: 10000 });

  await page.getByTestId("card-modal-labels").click();
  await page.getByRole("button", { name: "Criar uma nova etiqueta" }).click();
  await page.getByTestId("label-editor-title").fill("Nova Label QA");
  await page.getByTestId("label-color-coral-13").click();
  await page.getByTestId("create-label-submit").click();
  await page.getByTestId("label-option-nova-label-qa").waitFor({ timeout: 10000 });
  await page.getByTestId("card-modal-labels").click();
  await page.keyboard.press("Escape");

  await assert((await page.locator("text=Nova Label QA").count()) > 0, "Nova etiqueta nao foi aplicada.");

  await page.locator('[data-testid="list-actions-list-request"]').click();
  await page.getByText("Acoes da Lista", { exact: true }).waitFor({ timeout: 10000 });
  await page.getByTestId("list-action-add-card").click();
  await page.locator('[data-testid="list-list-request"]').getByPlaceholder("Adicionar um cartao").fill("Card criado pela lista");
  await page.locator('[data-testid="list-list-request"]').getByRole("button", { name: "Salvar" }).click();
  await page.getByText("Card criado pela lista", { exact: true }).waitFor({ timeout: 10000 });

  await page.locator('[data-testid="list-actions-list-request"]').click();
  await page.getByTestId("list-action-copy").click();
  const copiedList = page.locator('[data-list-title="Solicitacao (copia)"]');
  await copiedList.waitFor({ timeout: 10000 });
  await copiedList.scrollIntoViewIfNeeded();

  const copyAction = copiedList.locator('button[title="Acoes da Lista"]').first();
  await copyAction.click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("list-action-archive").click();

  await page.waitForTimeout(500);
  await assert((await page.locator('[data-list-title="Solicitacao (copia)"]').count()) === 0, "Lista copiada nao foi arquivada.");

  console.log("ADVANCED_OK");
} finally {
  await browser.close();
}
