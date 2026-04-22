import { bootstrapContext } from "@agent-control-plane/config";
import { DEFAULT_WORKFLOW_TEMPLATE, DEMO_IDS } from "@agent-control-plane/domain";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/create-app";
import { DatabaseTaskDispatcher } from "../../worker/src/database-task-dispatcher";
import { LocalArtifactStorage } from "../../worker/src/local-artifact-storage";
import { MockExecutor } from "../../worker/src/mock-executor";

const TEST_DATABASE_URL = `file:${path.resolve(process.cwd(), "prisma/test.db").replace(/\\/g, "/")}`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL
    }
  }
});

async function seedBootstrap() {
  await prisma.workspace.create({
    data: {
      id: DEMO_IDS.workspaceId,
      name: "Studio Zero",
      slug: "studio-zero",
      status: "active",
      planType: "internal"
    }
  });

  await prisma.member.createMany({
    data: [
      {
        id: DEMO_IDS.ownerMemberId,
        workspaceId: DEMO_IDS.workspaceId,
        name: "林川",
        email: "owner@test.local",
        role: "owner",
        status: "active"
      },
      {
        id: DEMO_IDS.approverMemberId,
        workspaceId: DEMO_IDS.workspaceId,
        name: "周宁",
        email: "approver@test.local",
        role: "approver",
        status: "active"
      }
    ]
  });

  await prisma.workspace.update({
    where: { id: DEMO_IDS.workspaceId },
    data: {
      ownerMemberId: DEMO_IDS.ownerMemberId
    }
  });

  await prisma.agent.create({
    data: {
      id: DEMO_IDS.agentId,
      workspaceId: DEMO_IDS.workspaceId,
      name: "Delivery Builder",
      roleName: "前端交付代理",
      adapterType: "mock",
      status: "active",
      description: "test mock executor"
    }
  });

  await prisma.workflowTemplate.create({
    data: {
      id: DEMO_IDS.workflowTemplateId,
      workspaceId: DEMO_IDS.workspaceId,
      name: DEFAULT_WORKFLOW_TEMPLATE.name,
      scenarioType: DEFAULT_WORKFLOW_TEMPLATE.scenarioType,
      version: DEFAULT_WORKFLOW_TEMPLATE.version,
      triggerType: "manual",
      status: "active",
      nodesJson: JSON.stringify(DEFAULT_WORKFLOW_TEMPLATE.nodes)
    }
  });

  await prisma.workspaceIntegrationConfig.create({
    data: {
      workspaceId: DEMO_IDS.workspaceId,
      defaultExecutorType: "mock",
      objectStorageProvider: "local-file",
      notificationChannel: "wechat",
      callbackBaseUrl: "https://callback.test.local",
      agentEndpoint: "https://agent.test.local",
      approvalMode: "manual"
    }
  });
}

async function advanceRunToWaitingApproval(runId: string) {
  const dispatcher = new DatabaseTaskDispatcher(prisma);
  const storage = new LocalArtifactStorage();
  const executor = new MockExecutor();

  const claimed = await dispatcher.claimNextRun();
  expect(claimed?.runId).toBe(runId);

  const execution = await executor.execute(claimed!);
  const storedArtifacts = await Promise.all(
    execution.artifacts.map((artifact) =>
      storage.persistArtifact({
        ...artifact,
        runId
      })
    )
  );

  await dispatcher.markWaitingApproval({
    runId,
    taskId: claimed!.taskId,
    outputSummary: execution.outputSummary,
    artifacts: storedArtifacts
  });

  return {
    taskId: claimed!.taskId,
    artifactIds: storedArtifacts.map((artifact) => artifact.id)
  };
}

describe("P1 control plane integration", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    process.env.ACP_DATA_DIR = ".test-data";
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    app = await createApp();
    await app.init();
  });

  beforeEach(async () => {
    await prisma.approval.deleteMany();
    await prisma.artifact.deleteMany();
    await prisma.run.deleteMany();
    await prisma.task.deleteMany();
    await prisma.certificate.deleteMany();
    await prisma.event.deleteMany();
    await prisma.project.deleteMany();
    await prisma.workflowTemplate.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.workspaceIntegrationConfig.deleteMany();
    await prisma.workspace.updateMany({
      data: {
        ownerMemberId: null
      }
    });
    await prisma.member.deleteMany();
    await prisma.workspace.deleteMany();

    await seedBootstrap();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("creates project, triggers workflow, lets worker advance run and approves it", async () => {
    const api = request(app.getHttpServer());

    const projectResponse = await api.post("/api/v1/projects").send({
      name: "测试交付项目",
      customerName: "蓝桥科技"
    });

    expect(projectResponse.status).toBe(201);
    const projectId = projectResponse.body.id as string;

    const triggerResponse = await api
      .post(`/api/v1/projects/${projectId}/workflows/${bootstrapContext.workflowTemplateId}/trigger`)
      .send({});

    expect(triggerResponse.status).toBe(201);
    const runId = triggerResponse.body.runId as string;

    await advanceRunToWaitingApproval(runId);

    const runResponse = await api.get(`/api/v1/runs/${runId}`);
    expect(runResponse.body.status).toBe("waiting_approval");
    expect(runResponse.body.artifacts).toHaveLength(1);

    const approvalResponse = await api.post(`/api/v1/runs/${runId}/approve`).send({
      approverMemberId: bootstrapContext.approverMemberId,
      comment: "通过，允许交付。"
    });

    expect(approvalResponse.status).toBe(201);
    expect(approvalResponse.body.status).toBe("succeeded");
    expect(approvalResponse.body.approval.decision).toBe("approved");

    const artifactsResponse = await api.get(`/api/v1/projects/${projectId}/artifacts`);
    const eventsResponse = await api.get(`/api/v1/projects/${projectId}/events`);

    expect(artifactsResponse.body).toHaveLength(1);
    expect(eventsResponse.body.some((item: { eventType: string }) => item.eventType === "approval.approved")).toBe(true);
  });

  it("treats duplicate approval submission as idempotent", async () => {
    const api = request(app.getHttpServer());

    const projectResponse = await api.post("/api/v1/projects").send({
      name: "幂等测试",
      customerName: "极星"
    });
    const projectId = projectResponse.body.id as string;

    const triggerResponse = await api
      .post(`/api/v1/projects/${projectId}/workflows/${bootstrapContext.workflowTemplateId}/trigger`)
      .send({});
    const runId = triggerResponse.body.runId as string;

    await advanceRunToWaitingApproval(runId);

    const first = await api.post(`/api/v1/runs/${runId}/approve`).send({
      approverMemberId: bootstrapContext.approverMemberId
    });
    const second = await api.post(`/api/v1/runs/${runId}/approve`).send({
      approverMemberId: bootstrapContext.approverMemberId
    });

    expect(first.body.status).toBe("succeeded");
    expect(second.body.status).toBe("succeeded");

    const approvals = await prisma.approval.findMany({
      where: { runId }
    });
    expect(approvals).toHaveLength(1);
  });

  it("serves dashboard, management endpoints and settings updates for the P2 console", async () => {
    const api = request(app.getHttpServer());

    const projectResponse = await api.post("/api/v1/projects").send({
      name: "控制台升级项目",
      customerName: "启航商贸"
    });
    const projectId = projectResponse.body.id as string;

    const triggerResponse = await api
      .post(`/api/v1/projects/${projectId}/workflows/${bootstrapContext.workflowTemplateId}/trigger`)
      .send({});
    const runId = triggerResponse.body.runId as string;

    const { taskId } = await advanceRunToWaitingApproval(runId);

    const runDetailResponse = await api.get(`/api/v1/runs/${runId}`);
    expect(runDetailResponse.status).toBe(200);
    const artifactId = runDetailResponse.body.artifacts[0].id as string;

    const certificate = await prisma.certificate.create({
      data: {
        projectId,
        title: "控制台升级项目证明摘要",
        status: "ready",
        verificationCode: "ACP-P2-TEST-0001",
        summaryJson: JSON.stringify({
          result: "ready"
        })
      }
    });

    await prisma.project.update({
      where: { id: projectId },
      data: {
        currentCertificateId: certificate.id
      }
    });

    const dashboardResponse = await api.get("/api/v1/dashboard");
    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.body.totalProjectCount).toBe(1);
    expect(dashboardResponse.body.pendingApprovalCount).toBe(1);

    const invalidProjectFilterResponse = await api.get("/api/v1/projects?status=invalid-status");
    expect(invalidProjectFilterResponse.status).toBe(400);

    const approvalsResponse = await api.get("/api/v1/approvals");
    expect(approvalsResponse.status).toBe(200);
    expect(approvalsResponse.body.pending).toHaveLength(1);

    const projectDetailResponse = await api.get(`/api/v1/projects/${projectId}`);
    expect(projectDetailResponse.status).toBe(200);
    expect(projectDetailResponse.body.latestCertificate.verificationCode).toBe("ACP-P2-TEST-0001");

    const taskDetailResponse = await api.get(`/api/v1/tasks/${taskId}`);
    expect(taskDetailResponse.status).toBe(200);
    expect(taskDetailResponse.body.runs).toHaveLength(1);

    const artifactDetailResponse = await api.get(`/api/v1/artifacts/${artifactId}`);
    expect(artifactDetailResponse.status).toBe(200);
    expect(artifactDetailResponse.body.runId).toBe(runId);

    const agentsResponse = await api.get("/api/v1/agents");
    expect(agentsResponse.status).toBe(200);
    expect(agentsResponse.body).toHaveLength(1);

    const workflowsResponse = await api.get("/api/v1/workflows");
    expect(workflowsResponse.status).toBe(200);
    expect(workflowsResponse.body[0].nodeCount).toBeGreaterThan(0);

    const workflowDetailResponse = await api.get(`/api/v1/workflows/${bootstrapContext.workflowTemplateId}`);
    expect(workflowDetailResponse.status).toBe(200);
    expect(workflowDetailResponse.body.nodes).toHaveLength(3);

    const certificatesResponse = await api.get("/api/v1/certificates");
    expect(certificatesResponse.status).toBe(200);
    expect(certificatesResponse.body).toHaveLength(1);

    const integrationResponse = await api.get("/api/v1/settings/integrations");
    expect(integrationResponse.status).toBe(200);
    expect(integrationResponse.body.notificationChannel).toBe("wechat");

    const integrationUpdateResponse = await api.put("/api/v1/settings/integrations").send({
      defaultExecutorType: "openapi",
      objectStorageProvider: "s3-compatible",
      notificationChannel: "feishu",
      callbackBaseUrl: "https://callback.changed.local",
      agentEndpoint: "https://agent.changed.local",
      approvalMode: "assisted"
    });
    expect(integrationUpdateResponse.status).toBe(200);
    expect(integrationUpdateResponse.body.defaultExecutorType).toBe("openapi");
    expect(integrationUpdateResponse.body.notificationChannel).toBe("feishu");

    const projectUpdateResponse = await api.put(`/api/v1/projects/${projectId}`).send({
      name: "控制台升级项目（已调整）",
      customerName: "启航商贸",
      targetDeliveryAt: "2026-05-31",
      status: "paused"
    });
    expect(projectUpdateResponse.status).toBe(200);
    expect(projectUpdateResponse.body.status).toBe("paused");
    expect(projectUpdateResponse.body.name).toBe("控制台升级项目（已调整）");

    await prisma.event.create({
      data: {
        workspaceId: DEMO_IDS.workspaceId,
        projectId,
        entityType: "project",
        entityId: projectId,
        eventType: "project.created",
        actorType: "system",
        actorId: DEMO_IDS.ownerMemberId,
        traceId: "trace-null-payload-summary",
        payloadJson: null
      }
    });

    const eventsWithEmptyPayload = await api.get(`/api/v1/projects/${projectId}/events`);
    expect(eventsWithEmptyPayload.status).toBe(200);
    expect(
      eventsWithEmptyPayload.body.some((event: { summary: string }) => event.summary === "项目已创建")
    ).toBe(true);
  });
});
