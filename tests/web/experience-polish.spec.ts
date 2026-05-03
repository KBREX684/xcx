import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";

const password = "AcpPilot#2026";

async function loginViaUi(page: Page) {
  await page.goto("/login");
  await page.getByLabel("邮箱地址").fill("pm@opc-pilot.local");
  await page.getByLabel("登录密码").fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test.describe("体验打磨验收", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page);
  });

  test("智能体页面仅保留团队筛选 chips", async ({ page }) => {
    await page.goto("/agents");
    const chipRow = page.getByRole("group", { name: "团队筛选" });
    await expect(chipRow).toBeVisible();
    await expect(chipRow.getByText("状态", { exact: true })).toHaveCount(0);
    await expect(chipRow.getByRole("link", { name: "可用" })).toHaveCount(0);
    await expect(chipRow.getByText("团队", { exact: true })).toBeVisible();
  });

  test("收件箱包含需关注筛选", async ({ page }) => {
    await page.goto("/messages");
    const filterRow = page.getByRole("tablist", { name: "消息筛选" });
    await expect(filterRow).toBeVisible();
    await expect(filterRow.getByRole("tab", { name: /需关注/ })).toBeVisible();
    await expect(filterRow.getByRole("tab", { name: /等待输入/ })).toBeVisible();
  });

  test("项目详情顶部展示证明 callout", async ({ page }) => {
    await page.goto("/projects");
    const firstProject = page.locator(".projects-table-body .projects-row").first();
    await firstProject.click();
    await expect(page.getByText("当前证明书", { exact: false })).toBeVisible();
    await expect(page.getByText("链头哈希")).toBeVisible();
  });

  test("详情页保留返回入口", async ({ page }) => {
    await page.goto("/agents");
    await page.locator(".data-list-link").first().click();
    await expect(page.getByRole("link", { name: /返回/ })).toBeVisible();
  });
});
