import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
});

const page = await browser.newPage({
  viewport: { width: 1600, height: 960 },
});

try {
  await page.goto("http://localhost:3000/boards/board-hub", {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  const sourceCard = page.locator('[data-card-title="Template: Novo site ou LP"]').first();
  const sourceHandle = sourceCard.locator('button[aria-label="Mover Template: Novo site ou LP"]').first();
  const targetList = page.locator('[data-list-title="Solicitacao"]').first();

  await sourceCard.waitFor({ state: "visible", timeout: 15000 });
  await sourceHandle.waitFor({ state: "visible", timeout: 15000 });
  await targetList.waitFor({ state: "visible", timeout: 15000 });

  const sourceBox = await sourceHandle.boundingBox();
  const targetBox = await targetList.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error("Nao foi possivel localizar os elementos para o drag and drop.");
  }

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
    steps: 30,
  });
  await page.waitForTimeout(250);
  await page.mouse.up();

  await page.waitForTimeout(700);

  const targetHasCard = await targetList.locator('[data-card-title="Template: Novo site ou LP"]').count();
  const sourceHasCard = await page
    .locator('[data-list-title="COMO DELEGAR DEMANDAS"]')
    .locator('[data-card-title="Template: Novo site ou LP"]')
    .count();

  if (targetHasCard < 1 || sourceHasCard !== 0) {
    throw new Error("O card nao foi movido corretamente entre as listas.");
  }

  console.log("DND_OK");
} finally {
  await browser.close();
}
