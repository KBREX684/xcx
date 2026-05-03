import "dotenv/config";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const apiBaseUrl =
  process.env.PLAYWRIGHT_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3101";
const password = "AcpPilot#2026";
const prisma = new PrismaClient();

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

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("agent-dispatch: 管理平台能委派、@Agent 通知并触发真实执行回执", async ({ page, request }) => {
  await loginViaUi(page);
  const token = await apiToken(request);

  await page.goto("/projects");
  await page.locator("summary.inline-disclosure-trigger").click();
  const projectName = `Agent Dispatch ${Date.now()}`;
  const createProjectForm = page.locator(".inline-disclosure-body");
  await expect(createProjectForm).toBeVisible();
  await createProjectForm.locator('input[name="name"]').fill(projectName);
  await createProjectForm.locator('input[name="customerName"]').fill("Linear Style QA");
  await page.getByRole("button", { name: "创建项目并进入工作台" }).click();
  await expect(page.getByRole("heading", { level: 1, name: projectName })).toBeVisible();

  const projectId = page.url().split("/projects/")[1]?.split(/[?#]/)[0] ?? "";
  expect(projectId).toBeTruthy();

  const taskTitle = `Agent 手动派遣 ${Date.now()}`;
  const taskForm = page.locator("form").filter({ has: page.locator('input[name="title"]') });
  await expect(taskForm).toHaveCount(1);
  await taskForm.locator('input[name="title"]').fill(taskTitle);
  await taskForm
    .locator('textarea[name="description"]')
    .fill("验证管理平台能像 Linear 一样把任务通知给 Agent，并收到执行回执。");
  await taskForm.getByRole("button", { name: "追加人工任务" }).click();

  let taskId = "";
  await expect
    .poll(
      async () => {
        const tasks = normalizeCollection<{ id: string; title: string }>(
          await getJson(request, token, `/api/v1/projects/${projectId}/tasks`),
        );
        taskId = tasks.find((task) => task.title === taskTitle)?.id ?? "";
        return Boolean(taskId);
      },
      { timeout: 20_000, intervals: [500, 1000] },
    )
    .toBe(true);

  await page.goto(`/projects/${projectId}/tasks/${taskId}`);
  await expect(page.getByRole("heading", { level: 1, name: taskTitle })).toBeVisible();

  const assignForm = page.locator("form").filter({ has: page.locator('select[name="agentId"]') });
  await expect(assignForm).toHaveCount(1);
  await assignForm.locator('select[name="agentId"]').selectOption("agt_requirements");
  await assignForm
    .locator('textarea[name="note"]')
    .fill("请先接收这条人工派遣，并等待任务线程里的执行指令。");
  await assignForm.getByRole("button", { name: "委派给 Agent" }).click();

  await expect
    .poll(
      async () => {
        const assignment = await prisma.taskAssignment.findFirst({
          where: { taskId, agentId: "agt_requirements" },
          orderBy: { createdAt: "desc" },
        });
        return Boolean(assignment);
      },
      { timeout: 20_000, intervals: [500, 1000] },
    )
    .toBe(true);

  await page.goto(`/projects/${projectId}/tasks/${taskId}`);
  const instructionBody = `@Requirements Agent 请执行 Linear 式任务接收回执 ${Date.now()}`;
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
            taskId,
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
    include: { run: true, message: { include: { mentions: true } } },
  });
  expect(completedInstruction.responseSummary).toBeTruthy();
  expect(
    completedInstruction.message.mentions.some((mention) => mention.agentId === "agt_requirements"),
  ).toBe(true);
  const responseSummary = completedInstruction.responseSummary;
  expect(responseSummary).toBeTruthy();

  const nonceLedger = completedInstruction.run?.nonce
    ? await prisma.nonceLedger.findUnique({ where: { nonce: completedInstruction.run.nonce } })
    : null;
  expect(nonceLedger?.agentId).toBe("agt_requirements");

  const agentReply = await prisma.conversationMessage.findFirst({
    where: {
      taskId,
      authorAgentId: "agt_requirements",
      body: responseSummary,
    },
  });
  expect(agentReply).toBeTruthy();

  await page.goto("/messages");
  await expect(page.locator("body")).toContainText(taskTitle);
  await page.goto(`/runs/${runId}`);
  await expect(page.locator("body")).toContainText("已成功执行");
});
