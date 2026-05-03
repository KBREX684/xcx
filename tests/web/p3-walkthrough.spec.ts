import "dotenv/config";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { bootstrapContext } from "@agent-control-plane/config";
import { PrismaClient } from "@prisma/client";

const apiBaseUrl =
  process.env.PLAYWRIGHT_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3101";
const password = "AcpPilot#2026";
const prisma = new PrismaClient();

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

async function loginViaUi(page: Page) {
  await page.goto("/login");
  await page.getByLabel("邮箱地址").fill("pm@opc-pilot.local");
  await page.getByLabel("登录密码").fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function apiToken(request: APIRequestContext) {
  const response = await request.post(`${apiBaseUrl}/auth/login`, {
    data: { email: "pm@opc-pilot.local", password },
  });
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as { accessToken: string }).accessToken;
}

async function apiJson<T>(
  request: APIRequestContext,
  token: string,
  method: "get" | "post" | "put",
  path: string,
  data?: unknown,
) {
  const response = await request[method](`${apiBaseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as T;
}

async function createProject(request: APIRequestContext, token: string, name: string) {
  return apiJson<{ id: string; name: string }>(request, token, "post", "/api/v1/projects", {
    name,
    customerName: "P3 Walkthrough",
    teamId: bootstrapContext.deliveryTeamId,
  });
}

async function createTask(
  request: APIRequestContext,
  token: string,
  projectId: string,
  title: string,
) {
  return apiJson<{ id: string; title: string }>(
    request,
    token,
    "post",
    `/api/v1/projects/${projectId}/tasks`,
    {
      title,
      description: `P3 walkthrough task for ${title}`,
      priority: "medium",
    },
  );
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("全局壳层导航、主题与折叠交互可用", async ({ page }) => {
  await loginViaUi(page);

  await page.goto("/messages");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const themeBefore = await page.locator("html").getAttribute("data-theme");
  await page.locator(".theme-toggle-trigger").first().click();
  await expect
    .poll(async () => page.locator("html").getAttribute("data-theme"))
    .not.toBe(themeBefore);

  await page.locator(".chrome-toggle-button").first().click({ force: true });
  await expect(page.locator(".chrome-toggle-button").first()).toBeVisible();
  await page.locator(".chrome-toggle-button").first().click({ force: true });
  await expect(page.locator(".chrome-toggle-button").first()).toBeVisible();

  for (const href of [
    "/projects",
    "/agents",
    "/workflows",
    "/certificates",
    "/settings/integrations",
    "/team",
  ]) {
    await page.goto(href);
    await expect(page).toHaveURL(new RegExp(`${href.replace("/", "\\/")}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  await page.goto("/profile");
  await expect(page.getByRole("heading", { level: 1, name: "个人资料" })).toBeVisible();
});

test("项目页触发工作流、审批通过、公开验证与客户确认可完整跑通", async ({ page, request }) => {
  await loginViaUi(page);
  const token = await apiToken(request);
  const project = await createProject(request, token, `P3 Flow ${Date.now()}`);

  await page.goto(`/projects/${project.id}`);
  await page.locator(".project-command-actions form button").first().click();

  let pendingRunId = "";
  await expect
    .poll(
      async () => {
        const payload = await apiJson<{ pending: Array<{ runId: string; projectId: string }> }>(
          request,
          token,
          "get",
          "/api/v1/approvals",
        );
        pendingRunId = payload.pending.find((item) => item.projectId === project.id)?.runId ?? "";
        return Boolean(pendingRunId);
      },
      { timeout: 90_000, intervals: [1000, 1500, 2000] },
    )
    .toBe(true);

  await page.goto("/approvals");
  await page
    .locator("article.list-card", { hasText: project.name })
    .locator(".embedded-form form")
    .first()
    .locator("button")
    .click();

  let certificateId = "";
  let verificationCode = "";
  await expect
    .poll(
      async () => {
        const certificates = normalizeCollection<{
          id: string;
          verificationCode: string;
          status: string;
        }>(await apiJson(request, token, "get", `/api/v1/projects/${project.id}/certificates`));
        const issued = certificates.find((item) => item.status === "issued");
        certificateId = issued?.id ?? "";
        verificationCode = issued?.verificationCode ?? "";
        return Boolean(certificateId && verificationCode);
      },
      { timeout: 60_000, intervals: [1000, 1500] },
    )
    .toBe(true);

  await page.goto(`/certificates/${certificateId}`);
  await page.locator(`a[href="/certificates/verify/${verificationCode}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/certificates/verify/${verificationCode}$`));
  await expect(page.locator("body")).toContainText("摘要哈希");
  await expect(page.locator("body")).toContainText("签名校验");

  await page.getByRole("button", { name: "提交确认" }).click();
  await expect
    .poll(
      async () => {
        const verify = await apiJson<{ acceptedAt: string | null }>(
          request,
          token,
          "get",
          `/api/v1/certificates/verify/${verificationCode}`,
        );
        return verify.acceptedAt;
      },
      { timeout: 30_000, intervals: [1000, 1500] },
    )
    .not.toBeNull();
});

test("设置保存、人工任务追加、手动签发与详情下钻页面均可用", async ({ page, request }) => {
  await loginViaUi(page);
  const token = await apiToken(request);
  const project = await createProject(request, token, `P3 Settings ${Date.now()}`);

  await page.goto("/settings/integrations");
  const callbackInput = page.locator('input[name="callbackBaseUrl"]');
  const nextCallback = `http://localhost:3000/api/callbacks?walkthrough=${Date.now()}`;
  await callbackInput.fill(nextCallback);
  await page
    .locator('form[action] button[type="submit"]')
    .filter({ hasText: /保存|淇濆瓨/ })
    .first()
    .click();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator('input[name="callbackBaseUrl"]')).toHaveValue(nextCallback);

  await page.goto(`/projects/${project.id}`);
  const taskTitle = `补充回归说明 ${Date.now()}`;
  await page.locator('input[name="title"]').fill(taskTitle);
  await page.locator('textarea[name="description"]').fill("补充客户验收所需的回归说明与截图说明。");
  await page.getByRole("button", { name: "追加人工任务" }).click();
  await expect(page.locator("body")).toContainText(taskTitle);

  await page
    .locator('form[action] button[type="submit"]')
    .filter({ hasText: /签发|绛惧彂/ })
    .click();
  await expect
    .poll(
      async () => {
        const certificates = normalizeCollection<{ id: string }>(
          await apiJson(request, token, "get", `/api/v1/projects/${project.id}/certificates`),
        );
        return certificates.length;
      },
      { timeout: 30_000, intervals: [1000, 1500] },
    )
    .toBeGreaterThan(0);

  const tasks = normalizeCollection<{ id: string; title: string }>(
    await apiJson(request, token, "get", `/api/v1/projects/${project.id}/tasks`),
  );
  await page.goto(`/projects/${project.id}/tasks/${tasks[0].id}`);
  await expect(page.getByRole("heading", { level: 1, name: tasks[0].title })).toBeVisible();
});

test("任务线程支持显式派遣、@Agent 指令与 Inbox 反馈", async ({ page, request }) => {
  await loginViaUi(page);
  const token = await apiToken(request);
  const project = await createProject(request, token, `P3 Agent Thread ${Date.now()}`);
  const task = await createTask(request, token, project.id, `Agent 协作测试 ${Date.now()}`);

  await page.goto(`/projects/${project.id}/tasks/${task.id}`);
  const assignForm = page.locator("form").filter({ has: page.locator('select[name="agentId"]') });
  await assignForm.locator('select[name="agentId"]').selectOption("agt_requirements");
  await assignForm.locator('textarea[name="note"]').fill("请先确认任务边界，再准备下一步执行。");
  await assignForm.locator('button[type="submit"]').click();

  await expect
    .poll(
      async () => {
        const assignment = await prisma.taskAssignment.findFirst({
          where: { taskId: task.id, agentId: "agt_requirements" },
          orderBy: { createdAt: "desc" },
        });
        return Boolean(assignment);
      },
      { timeout: 20_000, intervals: [500, 1000] },
    )
    .toBe(true);

  await page.goto(`/projects/${project.id}/tasks/${task.id}`);
  await expect(page.locator("body")).toContainText("Requirements Agent");

  const instructionBody = `@Requirements Agent 请补充这条任务的执行摘要和边界说明 ${Date.now()}。`;
  const messageForm = page.locator("form.thread-composer");
  await expect(messageForm).toHaveCount(1);
  await messageForm.locator('textarea[name="body"]').fill(instructionBody);
  await messageForm.getByRole("button", { name: "发送到任务线程" }).click();

  let instructionId = "";
  let runId = "";
  await expect
    .poll(
      async () => {
        const instruction = await prisma.agentInstruction.findFirst({
          where: {
            taskId: task.id,
            agentId: "agt_requirements",
            prompt: instructionBody,
          },
          orderBy: { createdAt: "desc" },
        });
        instructionId = instruction?.id ?? "";
        runId = instruction?.runId ?? "";
        return Boolean(instructionId && runId);
      },
      { timeout: 20_000, intervals: [500, 1000] },
    )
    .toBe(true);

  await expect
    .poll(
      async () => {
        const instruction = await prisma.agentInstruction.findUnique({
          where: { id: instructionId },
          include: { run: true },
        });
        return {
          instructionStatus: instruction?.status,
          runStatus: instruction?.run?.status,
          hasSignature: Boolean(instruction?.run?.agentSignature),
          hasNonce: Boolean(instruction?.run?.nonce),
          hasSignedAt: Boolean(instruction?.run?.signedAt),
        };
      },
      { timeout: 90_000, intervals: [1000, 1500, 2000] },
    )
    .toEqual({
      instructionStatus: "completed",
      runStatus: "succeeded",
      hasSignature: true,
      hasNonce: true,
      hasSignedAt: true,
    });

  const completedInstruction = await prisma.agentInstruction.findUniqueOrThrow({
    where: { id: instructionId },
    include: { message: { include: { mentions: true } }, run: true },
  });
  expect(completedInstruction.responseSummary).toBeTruthy();
  expect(
    completedInstruction.message.mentions.some((mention) => mention.agentId === "agt_requirements"),
  ).toBe(true);

  const nonceLedger = completedInstruction.run?.nonce
    ? await prisma.nonceLedger.findUnique({ where: { nonce: completedInstruction.run.nonce } })
    : null;
  expect(nonceLedger?.agentId).toBe("agt_requirements");

  const agentReply = await prisma.conversationMessage.findFirst({
    where: {
      taskId: task.id,
      authorAgentId: "agt_requirements",
      body: completedInstruction.responseSummary ?? "",
    },
  });
  expect(agentReply).toBeTruthy();

  const inbox = normalizeCollection<{ kind: string; href: string }>(
    await apiJson(request, token, "get", "/api/v1/inbox"),
  );
  expect(inbox.some((item) => item.kind === "assignment" && item.href.includes(task.id))).toBe(
    true,
  );
  expect(inbox.some((item) => item.kind === "mention" && item.href.includes(task.id))).toBe(true);
  expect(inbox.some((item) => item.kind === "reply" && item.href.includes(task.id))).toBe(true);
  expect(runId).toBeTruthy();
});
