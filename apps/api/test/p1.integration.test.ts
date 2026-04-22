import { bootstrapContext } from "@agent-control-plane/config";
import { DEFAULT_WORKFLOW_TEMPLATE, DEMO_IDS } from "@agent-control-plane/domain";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/create-app";
import { DatabaseTaskDispatcher } from "../../worker/src/database-task-dispatcher";
import { LocalArtifactStorage } from "../../worker/src/local-artifact-storage";
import { MockExecutor } from "../../worker/src/mock-executor";

const prisma = new PrismaClient();

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
      roleName: "前端交付 Agent",
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
}

describe("P1 control plane integration", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    process.env.ACP_DATA_DIR = ".test-data";
    app = await createApp();
    await app.init();
  });

  beforeEach(async () => {
    await prisma.approval.deleteMany();
    await prisma.artifact.deleteMany();
    await prisma.run.deleteMany();
    await prisma.task.deleteMany();
    await prisma.event.deleteMany();
    await prisma.project.deleteMany();
    await prisma.workflowTemplate.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.member.deleteMany();

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
    const projectId = projectResponse.body.id;

    const triggerResponse = await api
      .post(`/api/v1/projects/${projectId}/workflows/${bootstrapContext.workflowTemplateId}/trigger`)
      .send({});

    expect(triggerResponse.status).toBe(201);
    const runId = triggerResponse.body.runId as string;

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
      customerName: "桥星"
    });
    const projectId = projectResponse.body.id;

    const triggerResponse = await api
      .post(`/api/v1/projects/${projectId}/workflows/${bootstrapContext.workflowTemplateId}/trigger`)
      .send({});
    const runId = triggerResponse.body.runId as string;

    const dispatcher = new DatabaseTaskDispatcher(prisma);
    const storage = new LocalArtifactStorage();
    const executor = new MockExecutor();
    const claimed = await dispatcher.claimNextRun();
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
});
