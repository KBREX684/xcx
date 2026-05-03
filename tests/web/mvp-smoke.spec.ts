import "dotenv/config";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { bootstrapContext } from "@agent-control-plane/config";

const apiBaseUrl =
  process.env.PLAYWRIGHT_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3101";
const password = "AcpPilot#2026";

async function loginViaUi(page: Page) {
  await page.goto("/login");
  await page.getByLabel("邮箱地址").fill("pm@opc-pilot.local");
  await page.getByLabel("登录密码").fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function apiToken(request: APIRequestContext) {
  const response = await request.post(`${apiBaseUrl}/auth/login`, {
    data: {
      email: "pm@opc-pilot.local",
      password,
    },
  });
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as { accessToken: string }).accessToken;
}

async function getJson<T>(request: APIRequestContext, token: string, path: string): Promise<T> {
  const response = await request.get(`${apiBaseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as T;
}

function normalizeCollection<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { value?: unknown[] }).value)
  ) {
    return (payload as { value: T[] }).value;
  }
  return [];
}

test("mvp-smoke: 登录、创建项目、审批、证书生成与公开验证", async ({ page, request }) => {
  test.setTimeout(240_000);
  await loginViaUi(page);

  const token = await apiToken(request);
  await page.goto("/projects");
  await page.locator("summary.inline-disclosure-trigger").click();
  const projectName = `MVP Smoke ${Date.now()}`;
  const createProjectForm = page.locator(".inline-disclosure-body");
  await expect(createProjectForm).toBeVisible();
  await createProjectForm.locator('input[name="name"]').fill(projectName);
  await createProjectForm.locator('select[name="teamId"]').selectOption(bootstrapContext.deliveryTeamId);
  await createProjectForm.locator('input[name="customerName"]').fill("Architecture Acceptance");
  await page.getByRole("button", { name: "创建项目并进入工作台" }).click();
  await expect(page.getByText(projectName).first()).toBeVisible();

  const projectId = page.url().split("/projects/")[1]?.split(/[?#]/)[0] ?? "";
  expect(projectId).toBeTruthy();
  await page.locator(".project-action-stack form button").filter({ hasText: "触发" }).first().click();

  let pendingRunId = "";
  await expect
    .poll(
      async () => {
        const approvals = await getJson<{ pending: Array<{ runId: string; projectId: string }> }>(
          request,
          token,
          "/api/v1/approvals",
        );
        pendingRunId = approvals.pending.find((item) => item.projectId === projectId)?.runId ?? "";
        return Boolean(pendingRunId);
      },
      { timeout: 90_000, intervals: [1000, 1500, 2000] },
    )
    .toBe(true);

  await page.goto("/approvals");
  await page
    .locator("article.list-card", { hasText: projectName })
    .locator(".embedded-form form")
    .first()
    .locator("button")
    .click();

  let verificationCode = "";
  await expect
    .poll(
      async () => {
        const certificates = normalizeCollection<{ verificationCode: string; status: string }>(
          await getJson(request, token, `/api/v1/projects/${projectId}/certificates`),
        );
        verificationCode =
          certificates.find((item) => item.status === "issued")?.verificationCode ?? "";
        return Boolean(verificationCode);
      },
      { timeout: 30_000, intervals: [1000, 1500] },
    )
    .toBe(true);

  await page.context().clearCookies();
  await page.goto(`/certificates/verify/${verificationCode}`);
  await expect(page.locator("body")).toContainText("摘要哈希");
  await expect(page.locator("body")).toContainText("签名校验");
  await expect(page.locator("body")).toContainText("事件链连续性");
  await expect(page.locator("body")).toContainText("客户确认需要登录后提交");
  await expect(page.getByRole("button", { name: "提交确认" })).toHaveCount(0);

  await page.getByRole("link", { name: "登录后确认" }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel("邮箱地址").fill("customer@opc-pilot.local");
  await page.getByLabel("登录密码").fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(new RegExp(`/certificates/verify/${verificationCode}$`));
  await expect(page.getByRole("button", { name: "提交确认" })).toBeVisible();
});
