import "dotenv/config";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const apiBaseUrl =
  process.env.PLAYWRIGHT_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3101";
const password = "AcpPilot#2026";
const prisma = new PrismaClient();

async function loginApi(request: APIRequestContext, email = "pm@opc-pilot.local") {
  const response = await request.post(`${apiBaseUrl}/auth/login`, {
    data: { email, password },
  });
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as { accessToken: string }).accessToken;
}

async function loginUi(page: Page) {
  await page.goto("/login");
  await page.getByLabel("邮箱地址").fill("pm@opc-pilot.local");
  await page.getByLabel("登录密码").fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("过期 token 访问受保护页会清 cookie 并跳转登录", async ({ page }) => {
  await page.context().addCookies([
    {
      name: "acp_token",
      value: "expired.invalid.token",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login\?reason=session_expired$/);
  await expect(page.locator("body")).toContainText("会话已过期");
});

test("登出后访问受保护页会回到登录页", async ({ page }) => {
  await loginUi(page);
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/login\?next=%2Fprojects$/);
});

test("跨 workspace 项目访问被拒绝", async ({ request }) => {
  const owner = await prisma.member.findFirstOrThrow({
    where: { email: "pm@opc-pilot.local" },
    select: { passwordHash: true },
  });
  const workspaceId = "wrk_e2e_other";
  const memberId = "mem_e2e_other_admin";
  const teamId = "team_e2e_other";
  const projectId = "prj_e2e_other";

  await prisma.workspace.upsert({
    where: { id: workspaceId },
    update: {},
    create: {
      id: workspaceId,
      name: "E2E Other Workspace",
      slug: "e2e-other",
      ownerMemberId: memberId,
      planType: "internal",
      status: "active",
    },
  });
  await prisma.member.upsert({
    where: { id: memberId },
    update: { passwordHash: owner.passwordHash },
    create: {
      id: memberId,
      workspaceId,
      name: "E2E Other Admin",
      email: "e2e-other-admin@opc-pilot.local",
      role: "admin",
      status: "active",
      passwordHash: owner.passwordHash,
    },
  });
  await prisma.team.upsert({
    where: { id: teamId },
    update: {},
    create: {
      id: teamId,
      workspace: { connect: { id: workspaceId } },
      name: "E2E Other Team",
      slug: "e2e-other-team",
      description: "Cross-workspace isolation fixture",
      leadMember: { connect: { id: memberId } },
      status: "active",
    },
  });
  await prisma.project.upsert({
    where: { id: projectId },
    update: {
      team: { connect: { id: teamId } },
    },
    create: {
      id: projectId,
      workspace: { connect: { id: workspaceId } },
      name: "E2E Other Project",
      projectCode: "PRJ-E2E-OTHER",
      customerName: "Other Customer",
      ownerMember: { connect: { id: memberId } },
      team: { connect: { id: teamId } },
      status: "active",
    },
  });

  const pilotToken = await loginApi(request);
  const otherToken = await loginApi(request, "e2e-other-admin@opc-pilot.local");

  const blocked = await request.get(`${apiBaseUrl}/api/v1/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${pilotToken}` },
  });
  expect(blocked.status()).toBe(404);

  const allowed = await request.get(`${apiBaseUrl}/api/v1/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${otherToken}` },
  });
  expect(allowed.ok()).toBeTruthy();
});
