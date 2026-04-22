import { PrismaClient, ProjectStatus, TaskPriority, TaskStatus } from "@prisma/client";
import { DEFAULT_WORKFLOW_TEMPLATE, DEMO_IDS } from "@agent-control-plane/domain";

const prisma = new PrismaClient();

async function seedWorkspace() {
  await prisma.workspace.upsert({
    where: { id: DEMO_IDS.workspaceId },
    update: {
      name: "零号工作室",
      slug: "studio-zero",
      planType: "internal",
      status: "active"
    },
    create: {
      id: DEMO_IDS.workspaceId,
      name: "零号工作室",
      slug: "studio-zero",
      planType: "internal",
      status: "active"
    }
  });

  await prisma.member.upsert({
    where: { id: DEMO_IDS.ownerMemberId },
    update: {
      name: "林川",
      role: "owner",
      status: "active"
    },
    create: {
      id: DEMO_IDS.ownerMemberId,
      workspaceId: DEMO_IDS.workspaceId,
      name: "林川",
      email: "owner@agent-control-plane.local",
      role: "owner",
      status: "active"
    }
  });

  await prisma.member.upsert({
    where: { id: DEMO_IDS.approverMemberId },
    update: {
      name: "周宁",
      role: "approver",
      status: "active"
    },
    create: {
      id: DEMO_IDS.approverMemberId,
      workspaceId: DEMO_IDS.workspaceId,
      name: "周宁",
      email: "approver@agent-control-plane.local",
      role: "approver",
      status: "active"
    }
  });

  await prisma.workspace.upsert({
    where: { id: DEMO_IDS.workspaceId },
    update: {
      name: "零号工作室",
      slug: "studio-zero",
      ownerMemberId: DEMO_IDS.ownerMemberId,
      planType: "internal",
      status: "active"
    },
    create: {
      id: DEMO_IDS.workspaceId,
      name: "零号工作室",
      slug: "studio-zero",
      ownerMemberId: DEMO_IDS.ownerMemberId,
      planType: "internal",
      status: "active"
    }
  });
}

async function seedAgentAndTemplate() {
  await prisma.agent.upsert({
    where: { id: DEMO_IDS.agentId },
    update: {
      name: "交付生成代理",
      roleName: "前端交付代理",
      adapterType: "mock",
      status: "active",
      description: "用于 MVP 阶段演示的本地模拟执行器。"
    },
    create: {
      id: DEMO_IDS.agentId,
      workspaceId: DEMO_IDS.workspaceId,
      name: "交付生成代理",
      roleName: "前端交付代理",
      adapterType: "mock",
      status: "active",
      description: "用于 MVP 阶段演示的本地模拟执行器。",
      tags: JSON.stringify(["mock", "delivery", "mini-program"])
    }
  });

  await prisma.workflowTemplate.upsert({
    where: { id: DEMO_IDS.workflowTemplateId },
    update: {
      name: DEFAULT_WORKFLOW_TEMPLATE.name,
      scenarioType: DEFAULT_WORKFLOW_TEMPLATE.scenarioType,
      version: DEFAULT_WORKFLOW_TEMPLATE.version,
      triggerType: "manual",
      status: "active",
      nodesJson: JSON.stringify(DEFAULT_WORKFLOW_TEMPLATE.nodes)
    },
    create: {
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

  await prisma.workspaceIntegrationConfig.upsert({
    where: { workspaceId: DEMO_IDS.workspaceId },
    update: {
      defaultExecutorType: "mock",
      objectStorageProvider: "local-file",
      notificationChannel: "wechat",
      callbackBaseUrl: "https://agent-control-plane.local/callbacks",
      agentEndpoint: "https://agent-control-plane.local/openapi",
      approvalMode: "manual"
    },
    create: {
      workspaceId: DEMO_IDS.workspaceId,
      defaultExecutorType: "mock",
      objectStorageProvider: "local-file",
      notificationChannel: "wechat",
      callbackBaseUrl: "https://agent-control-plane.local/callbacks",
      agentEndpoint: "https://agent-control-plane.local/openapi",
      approvalMode: "manual"
    }
  });
}

async function seedProject() {
  await prisma.project.upsert({
    where: { id: DEMO_IDS.projectId },
    update: {
      name: "星河商城小程序",
      projectCode: "PRJ-MINI-001",
      customerName: "星河商业",
      ownerMemberId: DEMO_IDS.ownerMemberId,
      status: ProjectStatus.active
    },
    create: {
      id: DEMO_IDS.projectId,
      workspaceId: DEMO_IDS.workspaceId,
      name: "星河商城小程序",
      projectCode: "PRJ-MINI-001",
      customerName: "星河商业",
      ownerMemberId: DEMO_IDS.ownerMemberId,
      status: ProjectStatus.active
    }
  });

  const existingTask = await prisma.task.findFirst({
    where: { projectId: DEMO_IDS.projectId }
  });

  if (!existingTask) {
    const task = await prisma.task.create({
      data: {
        id: DEMO_IDS.taskId,
        projectId: DEMO_IDS.projectId,
        sourceTemplateId: DEMO_IDS.workflowTemplateId,
        title: "准备小程序交付需求摘要",
        description: "等待首次触发模板后由 mock executor 生成交付摘要与审批材料。",
        status: TaskStatus.planned,
        priority: TaskPriority.high,
        ownerType: "agent",
        ownerAgentId: DEMO_IDS.agentId
      }
    });

    await prisma.event.create({
      data: {
        workspaceId: DEMO_IDS.workspaceId,
        projectId: DEMO_IDS.projectId,
        entityType: "task",
        entityId: task.id,
        eventType: "task.seeded",
        actorType: "system",
        actorId: DEMO_IDS.ownerMemberId,
        traceId: "seed-trace",
        payloadJson: JSON.stringify({
          title: task.title
        })
      }
    });
  }

  await prisma.certificate.upsert({
    where: { verificationCode: "ACP-DEMO-20260422" },
    update: {
      projectId: DEMO_IDS.projectId,
      title: "星河商城小程序 · 阶段过程证明书",
      status: "ready",
      summaryJson: JSON.stringify({
        version: "0.1.0",
        highlights: ["已建立交付闭环", "已沉淀审批记录", "已生成交付摘要"]
      })
    },
    create: {
      projectId: DEMO_IDS.projectId,
      title: "星河商城小程序 · 阶段过程证明书",
      status: "ready",
      verificationCode: "ACP-DEMO-20260422",
      summaryJson: JSON.stringify({
        version: "0.1.0",
        highlights: ["已建立交付闭环", "已沉淀审批记录", "已生成交付摘要"]
      })
    }
  });

  await prisma.project.update({
    where: { id: DEMO_IDS.projectId },
    data: {
      currentCertificateId: (
        await prisma.certificate.findUnique({
          where: { verificationCode: "ACP-DEMO-20260422" },
          select: { id: true }
        })
      )?.id
    }
  });
}

async function main() {
  await seedWorkspace();
  await seedAgentAndTemplate();
  await seedProject();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
