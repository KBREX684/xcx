import "dotenv/config";
import { createServer, type IncomingMessage } from "node:http";
import { AddressInfo } from "node:net";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { bootstrapContext } from "@agent-control-plane/config";
import { createAgentAdvanceDigest, createWebhookSignature } from "@agent-control-plane/domain";
import { PrismaClient } from "@prisma/client";
import { WebhookDispatcher } from "../../apps/worker/src/webhook-dispatcher";

const apiBaseUrl =
  process.env.PLAYWRIGHT_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3101";
const password = "AcpPilot#2026";
const prisma = new PrismaClient();

test.describe.configure({ mode: "serial" });

async function loginViaUi(page: Page, email = "pm@opc-pilot.local") {
  await page.goto("/login");
  await page.getByLabel("邮箱地址").fill(email);
  await page.getByLabel("登录密码").fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function apiToken(request: APIRequestContext, email = "pm@opc-pilot.local") {
  const response = await request.post(`${apiBaseUrl}/auth/login`, {
    data: { email, password },
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
): Promise<T> {
  const response = await request[method](`${apiBaseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as T;
}

async function createProject(request: APIRequestContext, token: string, name: string) {
  return apiJson<{ id: string }>(request, token, "post", "/api/v1/projects", {
    name,
    customerName: "Iteration 1 QA",
    teamId: bootstrapContext.deliveryTeamId,
  });
}

async function triggerWorkflow(request: APIRequestContext, token: string, projectId: string) {
  return apiJson<{ runId: string }>(
    request,
    token,
    "post",
    `/api/v1/projects/${projectId}/workflows/${bootstrapContext.workflowTemplateId}/trigger`,
    {},
  );
}

async function createTask(
  request: APIRequestContext,
  token: string,
  projectId: string,
  title: string,
  parentId?: string | null,
) {
  return apiJson<{ id: string; depth: number; parentId: string | null }>(
    request,
    token,
    "post",
    `/api/v1/projects/${projectId}/tasks`,
    {
      title,
      description: `Iteration 1 task hierarchy coverage for ${title}`,
      priority: "medium",
      parentId: parentId ?? null,
    },
  );
}

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("error", reject);
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

async function startWebhookReceiver() {
  const received: Array<{ body: string; signature: string | undefined }> = [];
  const server = createServer(async (request, response) => {
    const body = await readBody(request);
    received.push({ body, signature: request.headers["x-acp-signature"] as string | undefined });
    response.writeHead(204);
    response.end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}/webhook`,
    received,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("H1: batch approval partial failure shows toast", async ({ page, request }) => {
  await loginViaUi(page);
  const token = await apiToken(request);
  const stamp = Date.now();
  const firstName = `I1 Partial A ${stamp}`;
  const secondName = `I1 Partial B ${stamp}`;
  const first = await createProject(request, token, firstName);
  const second = await createProject(request, token, secondName);
  await triggerWorkflow(request, token, first.id);
  await triggerWorkflow(request, token, second.id);

  let pendingRunIds: string[] = [];
  await expect
    .poll(
      async () => {
        const approvals = await apiJson<{ pending: Array<{ runId: string; projectId: string }> }>(
          request,
          token,
          "get",
          "/api/v1/approvals",
        );
        pendingRunIds = approvals.pending
          .filter((item) => item.projectId === first.id || item.projectId === second.id)
          .map((item) => item.runId);
        return pendingRunIds.length;
      },
      { timeout: 90_000, intervals: [1000, 1500, 2000] },
    )
    .toBe(2);

  await page.goto("/approvals");
  await page
    .locator("article.list-card", { hasText: firstName })
    .locator('input[type="checkbox"]')
    .check();
  await page
    .locator("article.list-card", { hasText: secondName })
    .locator('input[type="checkbox"]')
    .check();

  await apiJson(request, token, "post", `/api/v1/runs/${pendingRunIds[0]}/approve`, {
    approverMemberId: bootstrapContext.approverMemberId,
    comment: "Pre-approved to force partial batch failure.",
  });

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "批量通过" }).click();
  await expect(page.locator("body")).toContainText("部分完成");
});

test("H1: non-admin revoke capability returns 403", async ({ request }) => {
  const adminToken = await apiToken(request);
  const developerToken = await apiToken(request, "developer@opc-pilot.local");
  const before = await prisma.agentCapabilityAuthorization.count({
    where: { agentId: "agt_requirements", revokedAt: null },
  });

  await apiJson(request, adminToken, "post", "/api/v1/agents/agt_requirements/grant-capability", {
    capabilityCode: "requirements-analysis",
  });

  const response = await request.post(
    `${apiBaseUrl}/api/v1/agents/agt_requirements/revoke-capability`,
    {
      headers: { Authorization: `Bearer ${developerToken}` },
      data: { capabilityCode: "requirements-analysis" },
    },
  );
  expect(response.status()).toBe(403);

  const after = await prisma.agentCapabilityAuthorization.count({
    where: { agentId: "agt_requirements", revokedAt: null },
  });
  expect(after).toBeGreaterThanOrEqual(before + 1);
});

test("H1: nonce replay returns 409 without adding success event", async ({ request }) => {
  const token = await apiToken(request);
  const project = await createProject(request, token, `I1 Nonce ${Date.now()}`);
  await triggerWorkflow(request, token, project.id);

  await expect
    .poll(
      async () => {
        return prisma.run.findFirst({
          where: {
            projectId: project.id,
            nonce: { not: null },
            agentSignature: { not: null },
            signedAt: { not: null },
          },
          orderBy: { updatedAt: "desc" },
        });
      },
      { timeout: 90_000, intervals: [1000, 1500, 2000] },
    )
    .toBeTruthy();
  const run = await prisma.run.findFirstOrThrow({
    where: {
      projectId: project.id,
      nonce: { not: null },
      agentSignature: { not: null },
      signedAt: { not: null },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (run.capabilityCode) {
    await apiJson(request, token, "post", `/api/v1/agents/${run.agentId}/grant-capability`, {
      capabilityCode: run.capabilityCode,
    });
  }

  const beforeEvents = await prisma.event.count({ where: { projectId: project.id } });
  const digest = createAgentAdvanceDigest({
    runId: run.id,
    nonce: run.nonce ?? "",
    signedAt: run.signedAt?.toISOString() ?? "",
    outputSummary: run.outputSummary,
    status: "succeeded",
  });
  const response = await request.post(`${apiBaseUrl}/api/v1/runs/${run.id}/advance`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      digest,
      signature: run.agentSignature,
      nonce: run.nonce,
      signedAt: run.signedAt?.toISOString(),
      outputSummary: run.outputSummary,
      status: "succeeded",
    },
  });
  expect(response.status()).toBe(409);
  await expect
    .poll(async () => prisma.event.count({ where: { projectId: project.id } }))
    .toBe(beforeEvents);
});

test("H2: task parent/sub hierarchy supports three levels and rejects invalid parents", async ({
  page,
  request,
}) => {
  await loginViaUi(page);
  const token = await apiToken(request);
  const project = await createProject(request, token, `I1 Hierarchy ${Date.now()}`);
  const root = await createTask(request, token, project.id, "Root delivery");
  const child = await createTask(request, token, project.id, "Module delivery", root.id);
  const grandchild = await createTask(request, token, project.id, "Concrete task", child.id);

  await page.goto(`/projects/${project.id}`);
  await expect(page.locator(`[data-task-depth="0"]`, { hasText: "Root delivery" })).toBeVisible();
  await expect(page.locator(`[data-task-depth="1"]`, { hasText: "Module delivery" })).toBeVisible();
  await expect(page.locator(`[data-task-depth="2"]`, { hasText: "Concrete task" })).toBeVisible();

  const selfParent = await request.put(`${apiBaseUrl}/api/v1/tasks/${root.id}/parent`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { parentId: root.id },
  });
  expect(selfParent.status()).toBe(400);

  const otherProject = await createProject(request, token, `I1 Other ${Date.now()}`);
  const otherTask = await createTask(request, token, otherProject.id, "Other root");
  const crossProject = await request.put(`${apiBaseUrl}/api/v1/tasks/${root.id}/parent`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { parentId: otherTask.id },
  });
  expect(crossProject.status()).toBe(400);

  const cycle = await request.put(`${apiBaseUrl}/api/v1/tasks/${root.id}/parent`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { parentId: grandchild.id },
  });
  expect(cycle.status()).toBe(400);

  const tooDeep = await request.post(`${apiBaseUrl}/api/v1/projects/${project.id}/tasks`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      title: "Too deep task",
      description: "This task would exceed the three-level hierarchy limit.",
      priority: "medium",
      parentId: grandchild.id,
    },
  });
  expect(tooDeep.status()).toBe(400);
});

test("H3: outbound webhook signs, dispatches, rejects non-admin, and records final failure", async ({
  page,
  request,
}) => {
  const receiver = await startWebhookReceiver();
  try {
    await loginViaUi(page);
    const token = await apiToken(request);
    const developerToken = await apiToken(request, "developer@opc-pilot.local");
    const secret = `iteration-1-secret-${Date.now()}`;

    await page.goto("/settings/integrations");
    await page.getByLabel("Webhook URL").fill(receiver.url);
    await page.getByLabel("Events").fill("webhook.test,task.created");
    await page.getByLabel("Secret").fill(secret);
    await page.getByRole("button", { name: "Create webhook" }).click();

    await expect
      .poll(
        async () =>
          prisma.webhook.findFirst({
            where: { url: receiver.url },
            orderBy: { createdAt: "desc" },
          }),
        {
          timeout: 20_000,
        },
      )
      .toBeTruthy();
    const webhook = await prisma.webhook.findFirstOrThrow({
      where: { url: receiver.url },
      orderBy: { createdAt: "desc" },
    });

    await page
      .locator("article.list-card", { hasText: receiver.url })
      .first()
      .getByRole("button", { name: "Test webhook" })
      .click();
    await expect
      .poll(
        () => receiver.received.some((item) => JSON.parse(item.body).eventType === "webhook.test"),
        {
          timeout: 20_000,
        },
      )
      .toBe(true);

    const testPayload = receiver.received.find(
      (item) => JSON.parse(item.body).eventType === "webhook.test",
    );
    expect(testPayload?.signature).toBe(createWebhookSignature(secret, testPayload?.body ?? ""));

    const forbidden = await request.post(`${apiBaseUrl}/api/v1/webhooks`, {
      headers: { Authorization: `Bearer ${developerToken}` },
      data: { url: receiver.url, events: ["task.created"], secret },
    });
    expect(forbidden.status()).toBe(403);

    const project = await createProject(request, token, `I1 Webhook ${Date.now()}`);
    await createTask(request, token, project.id, "Webhook task");
    await expect
      .poll(
        () => receiver.received.some((item) => JSON.parse(item.body).eventType === "task.created"),
        {
          timeout: 20_000,
        },
      )
      .toBe(true);

    const badWebhook = await prisma.webhook.create({
      data: {
        workspaceId: bootstrapContext.workspaceId,
        url: "http://127.0.0.1:9/unreachable",
        secret,
        eventsJson: JSON.stringify(["task.created"]),
        createdByMemberId: bootstrapContext.ownerMemberId,
      },
    });
    const failedDelivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: badWebhook.id,
        workspaceId: bootstrapContext.workspaceId,
        eventType: "task.created",
        payloadJson: JSON.stringify({ eventType: "task.created", webhookId: badWebhook.id }),
        attemptCount: 2,
        nextAttemptAt: new Date(),
      },
    });

    await new WebhookDispatcher(prisma).dispatchDue();
    const finalDelivery = await prisma.webhookDelivery.findUniqueOrThrow({
      where: { id: failedDelivery.id },
    });
    expect(finalDelivery.status).toBe("failed");
    expect(finalDelivery.attemptCount).toBe(3);
    await expect
      .poll(async () =>
        prisma.event.count({
          where: {
            workspaceId: bootstrapContext.workspaceId,
            entityId: badWebhook.id,
            eventType: "webhook.delivery_failed",
          },
        }),
      )
      .toBeGreaterThan(0);

    expect(webhook.secret).toBe(secret);
  } finally {
    await receiver.close();
  }
});
