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

  const listActionsTrigger = page.locator('[data-testid^="list-actions-"]').nth(1);
  await listActionsTrigger.click();
  const listPopover = page.locator('div[data-state="open"].fixed').last();
  const listPopoverBox = await listPopover.boundingBox();
  await ensure(Boolean(listPopoverBox), "Popover de lista nao abriu.");
  await ensure(listPopoverBox.y + listPopoverBox.height <= 980, "Popover de lista ainda esta cortado.");
  await page.keyboard.press("Escape");

  const card = page.locator('[data-card-title="Template: Novo site ou LP"]').first();
  await card.locator('[data-testid^="open-card-"]').click();
  await page.getByText("Comentarios e atividade", { exact: true }).waitFor({ timeout: 15000 });

  const modal = page.locator('[data-slot="dialog-content"]').last();
  const modalBox = await modal.boundingBox();
  await ensure(Boolean(modalBox), "Modal do card nao abriu.");
  await ensure(modalBox.width >= 1080, "Modal do card ainda esta estreito demais.");

  await page.getByTestId("card-modal-labels").click();
  const labelsPopover = page.locator('div[data-state="open"].fixed').last();
  const labelsPopoverBox = await labelsPopover.boundingBox();
  await ensure(Boolean(labelsPopoverBox), "Popover de etiquetas nao abriu.");
  await ensure(labelsPopoverBox.y + labelsPopoverBox.height <= 980, "Popover de etiquetas ainda esta cortado.");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Editar" }).click();
  const editor = page.locator(".flowboard-rich-editor").last();
  await editor.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("Descricao premium do ClientBoard com editor rico.");
  await page.getByRole("button", { name: "Salvar" }).click();
  await page.locator(".flowboard-rich-copy").getByText("Descricao premium do ClientBoard com editor rico.", { exact: false }).waitFor({
    timeout: 10000,
  });
  await page.keyboard.press("Escape");

  await ensure(
    (await card.getByText("Descricao premium do ClientBoard com editor rico.", { exact: false }).count()) > 0,
    "Preview da descricao rica nao apareceu no card.",
  );

  console.log("CARD_EXPERIENCE_OK");
} finally {
  await browser.close();
}
