import "dotenv/config";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { computePublicKeyFingerprint } from "@agent-control-plane/domain";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * Iteration 5 最终验收 · 多 Agent 完整项目剧本。
 *
 * 与既有 e2e 的分工：
 *   - mvp-smoke.spec.ts       → 单一 happy path（登录/项目/审批/证书/登录确认）
 *   - agent-dispatch.spec.ts  → 单 Agent 派遣 + @mention + 回执
 *   - well-known.spec.ts      → 双公开端点契约
 *   - 【本文件】               → 5 Agent 串联 + 证书签发 + 公开核验 +
 *                                certificate.verified 事件 + 吊销 + 再核验
 *
 * 剧情：OPC PM 用内置模板「活动报名小程序交付流程 v1」一键串联
 *      需求/页面/前端/QA/文档 5 个 Agent，审批通过签发证书，第三方核验通过，
 *      随后主动吊销，确认公开端点与再核验路径都能识别吊销状态。
 *
 * 故意不覆盖：
 *   - 样式/CSS class（由 p3-walkthrough / ui-feedback 承担）
 *   - a11y（由 a11y.spec 承担）
 *   - 登录错误限流（由 auth.spec 承担）
 */

const apiBaseUrl =
  process.env.PLAYWRIGHT_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3101";
const password = "AcpPilot#2026";
const prisma = new PrismaClient();
const execFileAsync = promisify(execFile);
const tsxCliPath = join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");

async function loginViaUi(page: Page, email = "pm@opc-pilot.local") {
  await page.goto("/login");
  await page.getByLabel("邮箱地址").fill(email);
  await page.getByLabel("登录密码").fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function apiToken(request: APIRequestContext, email = "pm@opc-pilot.local") {
  const res = await request.post(`${apiBaseUrl}/auth/login`, {
    data: { email, password },
  });
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { accessToken: string }).accessToken;
}

async function getJson<T>(request: APIRequestContext, token: string, path: string): Promise<T> {
  const res = await request.get(`${apiBaseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as T;
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

function revokedEntries(payload: { revoked?: Array<{ verificationCode: string }> }) {
  return Array.isArray(payload.revoked) ? payload.revoked : [];
}

async function runAcpVerify(args: string[]) {
  return execFileAsync(
    process.execPath,
    [tsxCliPath, join(process.cwd(), "packages", "domain", "bin", "acp-verify.ts"), ...args],
    {
      cwd: process.cwd(),
      timeout: 30_000,
    },
  );
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("multi-agent-delivery: 5 Agent 串联 → 签发 → 公开核验 → 吊销 → 再核验", async ({
  page,
  request,
}) => {
  test.setTimeout(300_000);

  // -------------------------------------------------------------------------
  // S1 登录 + S2 创建项目
  // -------------------------------------------------------------------------
  await loginViaUi(page);
  const token = await apiToken(request);

  await page.goto("/projects");
  await page.locator("summary.inline-disclosure-trigger").click();
  const projectName = `MultiAgent ${Date.now()}`;
  const createForm = page.locator(".inline-disclosure-body");
  await expect(createForm).toBeVisible();
  await createForm.locator('input[name="name"]').fill(projectName);
  await createForm.locator('input[name="customerName"]').fill("Freeze Acceptance");
  await page.getByRole("button", { name: "创建项目并进入工作台" }).click();
  await expect(page.getByRole("heading", { level: 1, name: projectName })).toBeVisible();

  const projectId = page.url().split("/projects/")[1]?.split(/[?#]/)[0] ?? "";
  expect(projectId).toBeTruthy();

  // -------------------------------------------------------------------------
  // S3 触发内置模板（requirements / page-plan / frontend / qa / docs → approval → done）
  // -------------------------------------------------------------------------
  await page.getByRole("button", { name: "触发 活动报名小程序交付流程 v1" }).click();

  // -------------------------------------------------------------------------
  // S4 等待所有 Agent 节点产出 Run，并确认至少 5 个 Run 成功
  // -------------------------------------------------------------------------
  let pendingRunId = "";
  await expect
    .poll(
      async () => {
        const approvals = await getJson<{
          pending: Array<{ runId: string; projectId: string }>;
        }>(request, token, "/api/v1/approvals");
        pendingRunId = approvals.pending.find((item) => item.projectId === projectId)?.runId ?? "";
        return Boolean(pendingRunId);
      },
      { timeout: 120_000, intervals: [1500, 2000, 3000] },
    )
    .toBe(true);

  // 现场快照：至少 5 个 Run 成功（5 个 Agent 节点）
  const runs = await prisma.run.findMany({
    where: { projectId },
    select: { id: true, status: true, agentSignature: true, nonce: true },
  });
  const succeeded = runs.filter((r) => r.status === "succeeded");
  expect(succeeded.length).toBeGreaterThanOrEqual(5);
  // 每个成功 Run 都应带签名与 nonce（Iteration 4 硬化）
  for (const run of succeeded) {
    expect(run.agentSignature).toBeTruthy();
    expect(run.nonce).toBeTruthy();
  }

  // -------------------------------------------------------------------------
  // S5 审批合并节点
  // -------------------------------------------------------------------------
  await page.goto(`/approvals/${pendingRunId}`);
  await expect(page.getByRole("heading", { name: "审批详情" })).toBeVisible();
  await expect(page.getByText(projectName)).toBeVisible();
  await page.getByRole("button", { name: "通过并进入交付" }).click();

  // -------------------------------------------------------------------------
  // S6 证书签发
  // -------------------------------------------------------------------------
  let verificationCode = "";
  let certificateId = "";
  await expect
    .poll(
      async () => {
        const list = normalizeCollection<{
          id: string;
          verificationCode: string;
          status: string;
        }>(await getJson(request, token, `/api/v1/projects/${projectId}/certificates`));
        const issued = list.find((c) => c.status === "issued");
        if (issued) {
          verificationCode = issued.verificationCode;
          certificateId = issued.id;
        }
        return Boolean(verificationCode && certificateId);
      },
      { timeout: 60_000, intervals: [1000, 1500] },
    )
    .toBe(true);

  // -------------------------------------------------------------------------
  // S7 公开端点契约：keys 非空、revocations 中不应有本证书
  // -------------------------------------------------------------------------
  const keysDoc = (await (
    await request.get(`${apiBaseUrl}/api/v1/.well-known/acp-signing-keys.json`)
  ).json()) as {
    envelopeVersion: string;
    keys: Array<{ kid: string; publicKeyHex: string }>;
  };
  expect(keysDoc.envelopeVersion).toBe("v1");
  expect(keysDoc.keys.length).toBeGreaterThan(0);

  const revocationsBeforeRaw = await request.get(
    `${apiBaseUrl}/api/v1/.well-known/acp-revocations.json`,
  );
  if (!revocationsBeforeRaw.ok()) {
    throw new Error(
      `revocations endpoint failed: ${revocationsBeforeRaw.status()} ${await revocationsBeforeRaw.text()}`,
    );
  }
  const revocationsBefore = (await revocationsBeforeRaw.json()) as {
    revoked: Array<{ verificationCode: string }>;
  };
  expect(Array.isArray(revocationsBefore.revoked)).toBe(true);
  expect(
    revokedEntries(revocationsBefore).some((r) => r.verificationCode === verificationCode),
  ).toBe(false);

  // -------------------------------------------------------------------------
  // S8 CLI 离线核验 + 主动核验（REST）
  // -------------------------------------------------------------------------
  const certificateDetail = await getJson<{
    digestSha256: string;
    signature: string;
    issuedAt: string;
    verificationCode: string;
    verificationUrl: string;
    summary: Record<string, unknown>;
  }>(request, token, `/api/v1/certificates/${certificateId}`);
  const signingKeyId = certificateDetail.signature.split(":")[1];
  const signingKey = keysDoc.keys.find((key) => key.kid === signingKeyId);
  if (!signingKey) {
    throw new Error(`Missing public key for kid=${signingKeyId}`);
  }

  const e2eDataDir = join(process.cwd(), ".test-data", "multi-agent-delivery");
  await mkdir(e2eDataDir, { recursive: true });
  const envelopePath = join(e2eDataDir, `${certificateId}.envelope.json`);
  const keysPath = join(e2eDataDir, `${certificateId}.keys.json`);
  await writeFile(
    envelopePath,
    JSON.stringify(
      {
        envelopeVersion: "v1",
        summary: certificateDetail.summary,
        digestSha256: certificateDetail.digestSha256,
        signature: certificateDetail.signature,
        publicKeyFingerprint: computePublicKeyFingerprint(signingKey.publicKeyHex),
        issuedAt: certificateDetail.issuedAt,
        verificationCode: certificateDetail.verificationCode,
        verificationUrl: certificateDetail.verificationUrl,
      },
      null,
      2,
    ),
    "utf8",
  );
  await writeFile(keysPath, JSON.stringify(keysDoc, null, 2), "utf8");
  const cliOk = await runAcpVerify([envelopePath, "--keys", keysPath]);
  expect(JSON.parse(cliOk.stdout) as { ok: boolean }).toMatchObject({ ok: true });

  const verifyOkRes = await request.get(
    `${apiBaseUrl}/api/v1/certificates/verify/${verificationCode}`,
  );
  expect(verifyOkRes.ok()).toBeTruthy();
  const verifyOk = await verifyOkRes.json();
  expect(verifyOk).toMatchObject({
    digestValid: true,
    signatureValid: true,
    chainValid: true,
    artifactDigestValid: true,
    status: "issued",
  });

  // -------------------------------------------------------------------------
  // S9 审计写入：CertificateVerification 至少 1 行 valid；certificate.verified 事件存在
  // -------------------------------------------------------------------------
  await expect
    .poll(
      async () => {
        const row = await prisma.certificateVerification.findFirst({
          where: { certificateId, outcome: "valid" },
          orderBy: { verifiedAt: "desc" },
        });
        return Boolean(row);
      },
      { timeout: 20_000, intervals: [500, 1000] },
    )
    .toBe(true);

  await expect
    .poll(
      async () => {
        const event = await prisma.event.findFirst({
          where: {
            projectId,
            entityId: certificateId,
            eventType: "certificate.verified",
          },
          orderBy: { occurredAt: "desc" },
        });
        return Boolean(event);
      },
      { timeout: 20_000, intervals: [500, 1000] },
    )
    .toBe(true);

  // -------------------------------------------------------------------------
  // S10 吊销（API 侧直接调用）
  // -------------------------------------------------------------------------
  const revokeRes = await request.post(
    `${apiBaseUrl}/api/v1/certificates/${certificateId}/revoke`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  expect(revokeRes.ok()).toBeTruthy();

  // DB 状态
  const revoked = await prisma.certificate.findUniqueOrThrow({ where: { id: certificateId } });
  expect(revoked.status).toBe("revoked");
  expect(revoked.revokedAt).not.toBeNull();

  // well-known 在 60s 缓存窗口内可能还没刷新；直接调服务方法是更可靠的断言路径，
  // 这里通过再核验来验证数据面已经是 revoked 状态。
  // -------------------------------------------------------------------------
  // S11 再核验应返回 status=revoked；审计表出现 outcome=revoked
  // -------------------------------------------------------------------------
  const verifyAfterRes = await request.get(
    `${apiBaseUrl}/api/v1/certificates/verify/${verificationCode}`,
  );
  expect(verifyAfterRes.ok()).toBeTruthy();
  const verifyAfter = await verifyAfterRes.json();
  expect(verifyAfter.status).toBe("revoked");

  await expect
    .poll(
      async () => {
        const row = await prisma.certificateVerification.findFirst({
          where: { certificateId, outcome: "revoked" },
          orderBy: { verifiedAt: "desc" },
        });
        return Boolean(row);
      },
      { timeout: 20_000, intervals: [500, 1000] },
    )
    .toBe(true);

  // 吊销列表应最终包含此证书（等一次 max-age=60 窗口 + 一次重拉）
  let revocationsAfter: { revoked: Array<{ verificationCode: string }> } = { revoked: [] };
  await expect
    .poll(
      async () => {
        const res = await request.get(`${apiBaseUrl}/api/v1/.well-known/acp-revocations.json`, {
          headers: { "Cache-Control": "no-cache" },
        });
        const body = (await res.json()) as {
          revoked: Array<{ verificationCode: string }>;
        };
        revocationsAfter = body;
        return revokedEntries(body).some((r) => r.verificationCode === verificationCode);
      },
      { timeout: 75_000, intervals: [5000, 10_000] },
    )
    .toBe(true);

  const revocationsPath = join(e2eDataDir, `${certificateId}.revocations.json`);
  await writeFile(revocationsPath, JSON.stringify(revocationsAfter, null, 2), "utf8");
  await expect(
    runAcpVerify([envelopePath, "--keys", keysPath, "--revocations", revocationsPath]),
  ).rejects.toMatchObject({
    stdout: expect.stringContaining('"reason": "revoked"'),
  });
});
