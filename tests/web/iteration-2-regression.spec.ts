import "dotenv/config";
import { createServer, type IncomingMessage } from "node:http";
import { AddressInfo } from "node:net";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { bootstrapContext } from "@agent-control-plane/config";
import { PrismaClient } from "@prisma/client";
import { toFriendlyError } from "../../apps/web/lib/error-messages";

const apiBaseUrl =
  process.env.PLAYWRIGHT_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3101";
const password = "AcpPilot#2026";
const prisma = new PrismaClient();

test.describe.configure({ mode: "serial" });

async function loginViaUi(page: Page, email = "pm@opc-pilot.local") {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
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
  method: "get" | "post" | "delete",
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
    customerName: "Iteration 2 QA",
    teamId: bootstrapContext.deliveryTeamId,
  });
}

async function createTask(
  request: APIRequestContext,
  token: string,
  projectId: string,
  title: string,
  parentId?: string | null,
) {
  return apiJson<{ id: string }>(request, token, "post", `/api/v1/projects/${projectId}/tasks`, {
    title,
    description: `Iteration 2 relation coverage for ${title}`,
    priority: "medium",
    parentId: parentId ?? null,
  });
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
  const received: string[] = [];
  const server = createServer(async (request, response) => {
    received.push(await readBody(request));
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

test("H7: task relations support blocks/relates/duplicates and reject circular blockers", async ({
  page,
  request,
}) => {
  await loginViaUi(page);
  const token = await apiToken(request);
  const project = await createProject(request, token, `I2 Relations ${Date.now()}`);
  const root = await createTask(request, token, project.id, "Root rollout");
  const api = await createTask(request, token, project.id, "API readiness");
  const docs = await createTask(request, token, project.id, "Docs readiness");

  await apiJson(request, token, "post", `/api/v1/tasks/${root.id}/relations`, {
    targetTaskId: api.id,
    relationType: "blocks",
  });
  await apiJson(request, token, "post", `/api/v1/tasks/${api.id}/relations`, {
    targetTaskId: docs.id,
    relationType: "relates",
  });
  await apiJson(request, token, "post", `/api/v1/tasks/${docs.id}/relations`, {
    targetTaskId: root.id,
    relationType: "duplicates",
  });

  const circular = await request.post(`${apiBaseUrl}/api/v1/tasks/${api.id}/relations`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      targetTaskId: root.id,
      relationType: "blocks",
    },
  });
  expect(circular.status()).toBe(400);

  const duplicate = await request.post(`${apiBaseUrl}/api/v1/tasks/${root.id}/relations`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      targetTaskId: api.id,
      relationType: "blocks",
    },
  });
  expect(duplicate.status()).toBe(409);

  const relatesCycle = await request.post(`${apiBaseUrl}/api/v1/tasks/${docs.id}/relations`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      targetTaskId: api.id,
      relationType: "relates",
    },
  });
  expect(relatesCycle.status()).toBe(400);

  await page.goto(`/projects/${project.id}?taskId=${root.id}`);
  await expect(page.getByRole("heading", { name: "Blocks, relates, duplicates" })).toBeVisible();
  await expect(page.locator("section.panel", { hasText: "Task relations" })).toContainText(
    "Blocks",
  );
  await expect(page.locator("section.panel", { hasText: "Task relations" })).toContainText(
    "API readiness",
  );
});

test("H8: webhook detail shows failed delivery and manual retry succeeds", async ({
  page,
  request,
}) => {
  const receiver = await startWebhookReceiver();
  try {
    await loginViaUi(page);
    const token = await apiToken(request);
    const webhook = await apiJson<{ id: string }>(request, token, "post", "/api/v1/webhooks", {
      url: receiver.url,
      events: ["task.created"],
      secret: `iteration-2-secret-${Date.now()}`,
    });
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        workspaceId: bootstrapContext.workspaceId,
        eventType: "task.created",
        payloadJson: JSON.stringify({ eventType: "task.created", retry: true }),
        status: "failed",
        attemptCount: 3,
        lastError: "HTTP 500",
        nextAttemptAt: new Date(),
      },
    });

    await page.goto(`/settings/integrations/webhooks/${webhook.id}`);
    await expect(page.getByRole("heading", { name: "交付可观测" })).toBeVisible();
    await expect(page.locator("article.list-card", { hasText: delivery.id })).toContainText(
      "HTTP 500",
    );
    await page.getByRole("button", { name: "重试失败投递" }).click();

    await expect.poll(() => receiver.received.length, { timeout: 20_000 }).toBeGreaterThan(0);
    await expect
      .poll(async () => prisma.webhookDelivery.findUnique({ where: { id: delivery.id } }), {
        timeout: 20_000,
      })
      .toMatchObject({ status: "succeeded" });
  } finally {
    await receiver.close();
  }
});

test("S3: webhook manual retry is debounced for the same delivery", async ({ request }) => {
  const token = await apiToken(request);
  const webhook = await apiJson<{ id: string }>(request, token, "post", "/api/v1/webhooks", {
    url: "http://127.0.0.1:9/acp-webhook",
    events: ["task.created"],
    secret: `iteration-3-secret-${Date.now()}`,
  });
  const delivery = await prisma.webhookDelivery.create({
    data: {
      webhookId: webhook.id,
      workspaceId: bootstrapContext.workspaceId,
      eventType: "task.created",
      payloadJson: JSON.stringify({ eventType: "task.created", retry: "debounce" }),
      status: "failed",
      attemptCount: 3,
      lastError: "HTTP 500",
      nextAttemptAt: new Date(),
    },
  });

  const firstRetry = await request.post(
    `${apiBaseUrl}/api/v1/webhooks/${webhook.id}/deliveries/${delivery.id}/retry`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    },
  );
  expect(firstRetry.ok()).toBeTruthy();

  const secondRetry = await request.post(
    `${apiBaseUrl}/api/v1/webhooks/${webhook.id}/deliveries/${delivery.id}/retry`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    },
  );
  expect(secondRetry.status()).toBe(429);
  expect(await secondRetry.text()).toContain("10");
});

test("H9: run detail exposes signature triplet and nonce ledger hit", async ({ page, request }) => {
  await loginViaUi(page);
  const token = await apiToken(request);
  const project = await createProject(request, token, `I2 Run Proof ${Date.now()}`);
  await apiJson<{ runId: string }>(
    request,
    token,
    "post",
    `/api/v1/projects/${project.id}/workflows/${bootstrapContext.workflowTemplateId}/trigger`,
    {},
  );

  let runId = "";
  let nonce = "";
  await expect
    .poll(
      async () => {
        const run = await prisma.run.findFirst({
          where: {
            projectId: project.id,
            agentSignature: { not: null },
            nonce: { not: null },
            signedAt: { not: null },
          },
          orderBy: { updatedAt: "desc" },
        });
        runId = run?.id ?? "";
        nonce = run?.nonce ?? "";
        if (!nonce) return false;
        return Boolean(await prisma.nonceLedger.findUnique({ where: { nonce } }));
      },
      { timeout: 90_000, intervals: [1000, 1500, 2000] },
    )
    .toBe(true);

  await page.goto(`/runs/${runId}`);
  await expect(page.getByRole("heading", { name: "Agent proof triplet" })).toBeVisible();
  await expect(page.locator("body")).toContainText(`Nonce: ${nonce}`);
  await expect(page.locator("body")).toContainText("NonceLedger: hit");
  await expect(page.locator("body")).toContainText("Nonce first seen:");
  await expect(page.locator("details", { hasText: "Agent signature" })).toBeVisible();
});

test("H10: friendly error mapping covers rate-limit, permission, replay, session, and signature copy", () => {
  expect(toFriendlyError("Too Many Requests")).toContain("频繁");
  expect(toFriendlyError("Admin role is required for this operation.")).toContain("权限不足");
  expect(toFriendlyError("Nonce already used")).toContain("签名已被使用");
  expect(toFriendlyError("jwt expired")).toContain("会话已过期");
  expect(toFriendlyError("signature invalid")).toContain("签名校验失败");
});
