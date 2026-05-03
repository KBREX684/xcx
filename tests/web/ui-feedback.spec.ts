import { expect, test, type Page } from "@playwright/test";

const password = "AcpPilot#2026";

async function loginViaUi(page: Page) {
  await page.goto("/login");
  await page.getByLabel("邮箱地址").fill("pm@opc-pilot.local");
  await page.getByLabel("登录密码").fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("项目页头部收口且进度条填充应与百分比一致", async ({ page }) => {
  await loginViaUi(page);
  await page.goto("/projects");

  await expect(page.locator(".breadcrumbs")).toHaveCount(0);
  await expect(page.locator(".page-description")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name: "项目列表" })).toBeVisible();
  await expect(page.getByText("新建项目")).toBeVisible();
  await expect(page.locator(".inline-disclosure-trigger svg")).toBeVisible();

  const track = page.locator(".projects-row .progress-track").first();
  const fill = page.locator(".projects-row .progress-fill").first();
  const progressValue = page.locator(".projects-row .progress-value").first();

  const progress = Number.parseInt((await progressValue.textContent()) ?? "0", 10);

  const ratio = await Promise.all([
    track.evaluate((node) => node.getBoundingClientRect().width),
    fill.evaluate((node) => node.getBoundingClientRect().width),
  ]).then(([trackWidth, fillWidth]) => (trackWidth > 0 ? fillWidth / trackWidth : 0));

  if (progress <= 0) {
    expect(ratio).toBeLessThan(0.05);
    return;
  }

  if (progress >= 100) {
    expect(ratio).toBeGreaterThan(0.95);
    return;
  }

  expect(Math.abs(ratio - progress / 100)).toBeLessThan(0.08);
});

test("流程模板整行可点击进入详情", async ({ page }) => {
  await loginViaUi(page);
  await page.goto("/workflows");

  await expect(page.locator(".breadcrumbs")).toHaveCount(0);
  await expect(page.locator(".page-description")).toHaveCount(0);

  const firstRow = page.locator(".projects-table-body .projects-row").first();
  await expect(firstRow).toBeVisible();
  await firstRow.click();

  await expect(page).toHaveURL(/\/workflows\/.+$/);
});

test("消息筛选标签可切换，总览作为顶级导航存在", async ({ page }) => {
  await loginViaUi(page);
  await page.goto("/messages");

  const approvalTab = page.getByRole("tab", { name: /审批变化/ });
  await approvalTab.click();
  await expect(approvalTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { level: 3, name: "审批变化" }).first()).toBeVisible();

  await page.goto("/");
  await expect(
    page.locator('.app-sidebar .sidebar-direct-link[href="/"] .sidebar-parent-copy').first(),
  ).toHaveText("总览");
  await expect(page.locator('.app-sidebar .sidebar-subnav-link[href="/"]')).toHaveCount(0);
});

test("团队页先展示列表，再进入详情并看到绑定表单", async ({ page }) => {
  await loginViaUi(page);
  await page.goto("/team");

  await expect(page.locator(".breadcrumbs")).toHaveCount(0);
  await expect(page.locator(".page-description")).toHaveCount(0);
  await expect(page.getByText("团队列表")).toBeVisible();

  const firstRow = page.locator(".projects-table-body .projects-row").first();
  await expect(firstRow).toBeVisible();
  await firstRow.click();

  await expect(page).toHaveURL(/\/team\/.+$/);
  await expect(page.getByRole("button", { name: "保存团队配置" })).toBeVisible();
});
