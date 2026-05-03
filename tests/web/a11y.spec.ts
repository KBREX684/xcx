import "dotenv/config";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { bootstrapContext } from "@agent-control-plane/config";

const apiBaseUrl =
  process.env.PLAYWRIGHT_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3101";
const password = "AcpPilot#2026";

async function loginViaUi(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("pm@opc-pilot.local");
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
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
  method: "get" | "post",
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

async function createA11yFixture(request: APIRequestContext, token: string) {
  const project = await apiJson<{ id: string }>(request, token, "post", "/api/v1/projects", {
    name: `A11y ${Date.now()}`,
    customerName: "Accessibility QA",
    teamId: bootstrapContext.deliveryTeamId,
  });
  const task = await apiJson<{ id: string }>(
    request,
    token,
    "post",
    `/api/v1/projects/${project.id}/tasks`,
    {
      title: "A11y detail task",
      description: "A manual task used to scan the task detail route.",
      priority: "medium",
    },
  );
  const webhook = await apiJson<{ id: string }>(request, token, "post", "/api/v1/webhooks", {
    url: "http://127.0.0.1:9/a11y-webhook",
    events: ["task.created"],
    secret: `a11y-secret-${Date.now()}`,
  });
  const workflowRun = await apiJson<{ runId: string }>(
    request,
    token,
    "post",
    `/api/v1/projects/${project.id}/workflows/${bootstrapContext.workflowTemplateId}/trigger`,
    {},
  );

  let pendingRunId = "";
  await expect
    .poll(
      async () => {
        const approvals = await apiJson<{ pending: Array<{ runId: string; projectId: string }> }>(
          request,
          token,
          "get",
          "/api/v1/approvals",
        );
        pendingRunId = approvals.pending.find((item) => item.projectId === project.id)?.runId ?? "";
        return Boolean(pendingRunId);
      },
      { timeout: 90_000, intervals: [1000, 1500, 2000] },
    )
    .toBe(true);

  await apiJson(request, token, "post", `/api/v1/runs/${pendingRunId}/approve`, {
    approverMemberId: bootstrapContext.approverMemberId,
    comment: "A11y baseline approval.",
  });

  let certificate: { id: string; status: string; verificationCode: string } | null = null;
  await expect
    .poll(
      async () => {
        const certificates = await apiJson<
          Array<{ id: string; status: string; verificationCode: string }>
        >(request, token, "get", `/api/v1/projects/${project.id}/certificates`);
        certificate = certificates.find((item) => item.status === "issued") ?? null;
        return Boolean(certificate);
      },
      { timeout: 30_000, intervals: [1000, 1500] },
    )
    .toBe(true);

  if (!certificate) {
    throw new Error("Issued certificate was not created for a11y scan.");
  }

  return {
    projectId: project.id,
    taskId: task.id,
    runId: workflowRun.runId,
    certificateId: certificate.id,
    verificationCode: certificate.verificationCode,
    webhookId: webhook.id,
  };
}

async function expectNoCriticalViolations(page: Page, path: string) {
  await page.goto(path);
  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter((violation) => violation.impact === "critical");
  expect(critical, `${path} critical axe violations`).toEqual([]);
}

test("H5: core pages have zero critical axe violations", async ({ page, request }) => {
  test.setTimeout(240_000);
  const token = await apiToken(request);
  const fixture = await createA11yFixture(request, token);
  await loginViaUi(page);

  const paths = [
    "/",
    "/projects",
    `/projects/${fixture.projectId}`,
    `/projects/${fixture.projectId}/tasks/${fixture.taskId}`,
    "/approvals",
    `/certificates/${fixture.certificateId}`,
    `/certificates/verify/${fixture.verificationCode}`,
    `/settings/integrations/webhooks/${fixture.webhookId}`,
    `/runs/${fixture.runId}`,
  ];

  for (const path of paths) {
    await expectNoCriticalViolations(page, path);
  }
});
