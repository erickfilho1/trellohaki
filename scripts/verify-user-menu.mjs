import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 940 } });

async function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 30000 });
  let popover = page.getByTestId("user-menu-popover");
  await page.getByTestId("open-user-menu").click();
  await popover.waitFor({ timeout: 10000 });
  await popover.getByText("Erick Filho", { exact: true }).waitFor({ timeout: 10000 });
  await page.getByTestId("user-menu-projects").click({ force: true });
  await page.getByText("Projetos entregues", { exact: true }).waitFor({ timeout: 10000 });

  await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 30000 });
  popover = page.getByTestId("user-menu-popover");
  await page.getByTestId("open-user-menu").click();
  await popover.waitFor({ timeout: 10000 });
  await page.getByTestId("user-menu-settings").click({ force: true });
  await page.getByText("Configuracoes", { exact: true }).waitFor({ timeout: 10000 });

  await page.goto("http://localhost:3000/configuracoes", { waitUntil: "networkidle", timeout: 30000 });
  popover = page.getByTestId("user-menu-popover");
  await page.getByTestId("open-user-menu").click();
  await popover.waitFor({ timeout: 10000 });
  await page.getByTestId("user-menu-board").click({ force: true });
  await page.getByText("Portal do cliente", { exact: true }).waitFor({ timeout: 10000 });

  await page.getByTestId("open-user-menu").click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  await assert((await page.getByTestId("user-menu-popover").count()) === 0, "Popup nao fechou com ESC.");

  await page.getByTestId("open-user-menu").click();
  await page.getByTestId("user-menu-logout").click({ force: true });
  await page.getByTestId("login-button").waitFor({ timeout: 10000 });

  console.log("USER_MENU_OK");
} finally {
  await browser.close();
}
