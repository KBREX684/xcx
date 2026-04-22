import { Inject, BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { bootstrapContext } from "@agent-control-plane/config";
import {
  applyApprovalDecision,
  approvalDecisionInputSchema,
  createProjectInputSchema,
  createTaskInputSchema,
  DEFAULT_WORKFLOW_TEMPLATE,
  type ApprovalDecision,
  type ApprovalDecisionInput,
  type ArtifactListItem,
  type CreateProjectInput,
  type CreateTaskInput,
  type EventTimelineItem,
  type ProjectSummary,
  type RunDetail,
  type TaskBoardItem
} from "@agent-control-plane/domain";
import { ActorType, type Approval, type Artifact, type Event, type Project, type Run, type Task } from "@prisma/client";
import { PrismaService } from "./prisma.service";

type ProjectWithRelations = Project & {
  tasks: Task[];
  runs: Run[];
  events: Event[];
};

type TaskWithRelations = Task & {
  ownerAgent: { name: string } | null;
  ownerMember: { name: string } | null;
  runs: Run[];
};

type RunWithRelations = Run & {
  agent: { name: string };
  artifacts: Artifact[];
  approval: (Approval & { approverMember: { name: string } }) | null;
};

@Injectable()
export class ControlPlaneService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listProjects(): Promise<ProjectSummary[]> {
    const projects = await this.prisma.project.findMany({
      where: { workspaceId: bootstrapContext.workspaceId },
      include: {
        tasks: true,
        runs: {
          orderBy: { createdAt: "desc" }
        },
        events: {
          orderBy: { occurredAt: "desc" },
          take: 1
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return projects.map((project) => this.mapProjectSummary(project));
  }

  async createProject(input: CreateProjectInput, traceId: string): Promise<ProjectSummary> {
    const parsed = createProjectInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const projectCode = `PRJ-${Date.now().toString().slice(-6)}`;

    const project = await this.prisma.project.create({
      data: {
        workspaceId: bootstrapContext.workspaceId,
        name: parsed.data.name,
        projectCode,
        customerName: parsed.data.customerName,
        ownerMemberId: bootstrapContext.ownerMemberId,
        status: "active"
      }
    });

    await this.recordEvent({
      projectId: project.id,
      entityType: "project",
      entityId: project.id,
      eventType: "project.created",
      actorType: "member",
      actorId: bootstrapContext.ownerMemberId,
      traceId,
      payloadJson: stringifyPayload({
        name: project.name,
        projectCode: project.projectCode
      })
    });

    const hydrated = await this.prisma.project.findUnique({
      where: { id: project.id },
      include: {
        tasks: true,
        runs: true,
        events: {
          orderBy: { occurredAt: "desc" },
          take: 1
        }
      }
    });

    if (!hydrated) {
      throw new NotFoundException("Project not found after creation");
    }

    return this.mapProjectSummary(hydrated);
  }

  async listProjectTasks(projectId: string): Promise<TaskBoardItem[]> {
    await this.ensureProject(projectId);

    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      include: {
        ownerAgent: { select: { name: true } },
        ownerMember: { select: { name: true } },
        runs: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
    });

    return tasks.map((task) => this.mapTaskBoardItem(task));
  }

  async createTask(projectId: string, input: CreateTaskInput, traceId: string): Promise<TaskBoardItem> {
    await this.ensureProject(projectId);

    const parsed = createTaskInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const task = await this.prisma.task.create({
      data: {
        projectId,
        sourceTemplateId: bootstrapContext.workflowTemplateId,
        title: parsed.data.title,
        description: parsed.data.description,
        status: "planned",
        priority: parsed.data.priority ?? "medium",
        ownerType: "member",
        ownerMemberId: bootstrapContext.ownerMemberId
      },
      include: {
        ownerAgent: { select: { name: true } },
        ownerMember: { select: { name: true } },
        runs: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    await this.recordEvent({
      projectId,
      entityType: "task",
      entityId: task.id,
      eventType: "task.created",
      actorType: "member",
      actorId: bootstrapContext.ownerMemberId,
      traceId,
      payloadJson: stringifyPayload({
        title: task.title
      })
    });

    return this.mapTaskBoardItem(task);
  }

  async triggerWorkflow(projectId: string, templateId: string, traceId: string): Promise<{ runId: string }> {
    const project = await this.ensureProject(projectId);
    const template = await this.prisma.workflowTemplate.findFirst({
      where: {
        id: templateId,
        workspaceId: bootstrapContext.workspaceId
      }
    });

    if (!template) {
      throw new NotFoundException("Workflow template not found");
    }

    const agent = await this.prisma.agent.findFirst({
      where: {
        id: DEFAULT_WORKFLOW_TEMPLATE.nodes[0]?.boundAgentId,
        workspaceId: bootstrapContext.workspaceId
      }
    });

    if (!agent) {
      throw new NotFoundException("Mock agent not found");
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          projectId: project.id,
          sourceTemplateId: template.id,
          title: `${template.name} · 交付摘要`,
          description: `为 ${project.customerName} 生成本次小程序交付的实现摘要、风险提示与审批材料。`,
          status: "in_progress",
          priority: "high",
          ownerType: "agent",
          ownerAgentId: agent.id
        }
      });

      const run = await tx.run.create({
        data: {
          projectId: project.id,
          taskId: task.id,
          workflowTemplateId: template.id,
          nodeKey: "implementation",
          agentId: agent.id,
          status: "queued",
          triggerType: "manual",
          inputPayload: stringifyPayload({
            prompt: task.description,
            scenario: template.scenarioType
          }),
          traceId
        }
      });

      await tx.event.createMany({
        data: [
          {
            workspaceId: bootstrapContext.workspaceId,
            projectId: project.id,
            entityType: "workflow",
            entityId: template.id,
            eventType: "workflow.triggered",
            actorType: ActorType.member,
            actorId: bootstrapContext.ownerMemberId,
            traceId,
            payloadJson: stringifyPayload({
              templateName: template.name
            })
          },
          {
            workspaceId: bootstrapContext.workspaceId,
            projectId: project.id,
            entityType: "task",
            entityId: task.id,
            eventType: "task.created",
            actorType: ActorType.member,
            actorId: bootstrapContext.ownerMemberId,
            traceId,
            payloadJson: stringifyPayload({
              title: task.title
            })
          },
          {
            workspaceId: bootstrapContext.workspaceId,
            projectId: project.id,
            entityType: "run",
            entityId: run.id,
            eventType: "run.queued",
            actorType: ActorType.member,
            actorId: bootstrapContext.ownerMemberId,
            traceId,
            payloadJson: stringifyPayload({
              nodeKey: run.nodeKey
            })
          }
        ]
      });

      return run;
    });

    return { runId: created.id };
  }

  async getRun(runId: string): Promise<RunDetail> {
    const run = await this.prisma.run.findUnique({
      where: { id: runId },
      include: {
        agent: { select: { name: true } },
        artifacts: {
          orderBy: { createdAt: "desc" }
        },
        approval: {
          include: {
            approverMember: { select: { name: true } }
          }
        }
      }
    });

    if (!run) {
      throw new NotFoundException("Run not found");
    }

    return this.mapRunDetail(run);
  }

  async approveRun(runId: string, input: ApprovalDecisionInput, traceId: string): Promise<RunDetail> {
    return this.handleApproval(runId, "approved", input, traceId);
  }

  async rejectRun(runId: string, input: ApprovalDecisionInput, traceId: string): Promise<RunDetail> {
    return this.handleApproval(runId, "rejected", input, traceId);
  }

  async listArtifacts(projectId: string): Promise<ArtifactListItem[]> {
    await this.ensureProject(projectId);

    const artifacts = await this.prisma.artifact.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" }
    });

    return artifacts.map((artifact) => ({
      id: artifact.id,
      title: artifact.title,
      artifactType: artifact.artifactType,
      storageUri: artifact.storageUri,
      mimeType: artifact.mimeType,
      sha256Digest: artifact.sha256Digest,
      createdAt: artifact.createdAt.toISOString()
    }));
  }

  async listEvents(projectId: string): Promise<EventTimelineItem[]> {
    await this.ensureProject(projectId);

    const events = await this.prisma.event.findMany({
      where: { projectId },
      orderBy: { occurredAt: "desc" },
      take: 30
    });

    return events.map((event) => this.mapEventTimelineItem(event));
  }

  private async handleApproval(
    runId: string,
    decision: ApprovalDecision,
    input: ApprovalDecisionInput,
    traceId: string
  ): Promise<RunDetail> {
    const parsed = approvalDecisionInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const run = await this.prisma.run.findUnique({
      where: { id: runId },
      include: {
        task: true,
        approval: true
      }
    });

    if (!run) {
      throw new NotFoundException("Run not found");
    }

    if (run.approval || ["succeeded", "failed", "cancelled", "timed_out"].includes(run.status)) {
      return this.getRun(runId);
    }

    if (run.status !== "waiting_approval") {
      throw new ConflictException("Run is not waiting for approval");
    }

    const transition = applyApprovalDecision(decision);
    const comment =
      parsed.data.comment?.trim() ||
      (decision === "approved" ? "审批通过，进入完成态。" : "需要补充回归说明后再提交。");

    await this.prisma.$transaction(async (tx) => {
      await tx.approval.create({
        data: {
          projectId: run.projectId,
          runId: run.id,
          taskId: run.taskId,
          approverMemberId: parsed.data.approverMemberId ?? bootstrapContext.approverMemberId,
          decision,
          comment
        }
      });

      await tx.run.update({
        where: { id: run.id },
        data: {
          status: transition.nextRunStatus,
          finishedAt: new Date()
        }
      });

      await tx.task.update({
        where: { id: run.taskId },
        data: {
          status: transition.nextTaskStatus,
          blockedReason: decision === "rejected" ? comment : null
        }
      });

      await tx.event.createMany({
        data: [
          {
            workspaceId: bootstrapContext.workspaceId,
            projectId: run.projectId,
            entityType: "approval",
            entityId: run.id,
            eventType: decision === "approved" ? "approval.approved" : "approval.rejected",
            actorType: ActorType.member,
            actorId: parsed.data.approverMemberId ?? bootstrapContext.approverMemberId,
            traceId,
            payloadJson: stringifyPayload({ comment })
          },
          {
            workspaceId: bootstrapContext.workspaceId,
            projectId: run.projectId,
            entityType: "run",
            entityId: run.id,
            eventType: decision === "approved" ? "run.succeeded" : "run.failed",
            actorType: ActorType.member,
            actorId: parsed.data.approverMemberId ?? bootstrapContext.approverMemberId,
            traceId,
            payloadJson: stringifyPayload({ taskId: run.taskId })
          },
          {
            workspaceId: bootstrapContext.workspaceId,
            projectId: run.projectId,
            entityType: "task",
            entityId: run.taskId,
            eventType: decision === "approved" ? "task.completed" : "task.reopened",
            actorType: ActorType.member,
            actorId: parsed.data.approverMemberId ?? bootstrapContext.approverMemberId,
            traceId,
            payloadJson: stringifyPayload({ comment })
          }
        ]
      });
    });

    return this.getRun(runId);
  }

  private async ensureProject(projectId: string): Promise<Project> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId: bootstrapContext.workspaceId
      }
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    return project;
  }

  private async recordEvent(input: {
    projectId: string;
    entityType: string;
    entityId: string;
    eventType: string;
    actorType: ActorType;
    actorId: string;
    traceId: string;
    payloadJson?: string;
  }) {
    await this.prisma.event.create({
      data: {
        workspaceId: bootstrapContext.workspaceId,
        projectId: input.projectId,
        entityType: input.entityType,
        entityId: input.entityId,
        eventType: input.eventType,
        actorType: input.actorType,
        actorId: input.actorId,
        traceId: input.traceId,
        payloadJson: input.payloadJson
      }
    });
  }

  private mapProjectSummary(project: ProjectWithRelations): ProjectSummary {
    const latestRun = [...project.runs].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null;
    const lastEvent = project.events[0] ?? null;

    return {
      id: project.id,
      name: project.name,
      projectCode: project.projectCode,
      customerName: project.customerName,
      status: project.status,
      targetDeliveryAt: project.targetDeliveryAt?.toISOString() ?? null,
      taskCount: project.tasks.length,
      completedTaskCount: project.tasks.filter((task) => task.status === "completed" || task.status === "delivered").length,
      latestRunStatus: latestRun?.status ?? null,
      pendingApprovalCount: project.runs.filter((run) => run.status === "waiting_approval").length,
      lastEventAt: lastEvent?.occurredAt.toISOString() ?? null
    };
  }

  private mapTaskBoardItem(task: TaskWithRelations): TaskBoardItem {
    const currentRun = task.runs[0] ?? null;
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      ownerLabel: task.ownerAgent?.name ?? task.ownerMember?.name ?? "未指派",
      dueAt: task.dueAt?.toISOString() ?? null,
      blockedReason: task.blockedReason ?? null,
      currentRunId: currentRun?.id ?? null,
      currentRunStatus: currentRun?.status ?? null,
      latestOutputSummary: currentRun?.outputSummary ?? null
    };
  }

  private mapRunDetail(run: RunWithRelations): RunDetail {
    return {
      id: run.id,
      projectId: run.projectId,
      taskId: run.taskId,
      nodeKey: run.nodeKey,
      agentName: run.agent.name,
      status: run.status,
      traceId: run.traceId,
      outputSummary: run.outputSummary ?? null,
      errorMessage: run.errorMessage ?? null,
      startedAt: run.startedAt?.toISOString() ?? null,
      finishedAt: run.finishedAt?.toISOString() ?? null,
      artifacts: run.artifacts.map((artifact) => ({
        id: artifact.id,
        title: artifact.title,
        artifactType: artifact.artifactType,
        storageUri: artifact.storageUri,
        mimeType: artifact.mimeType,
        sha256Digest: artifact.sha256Digest,
        createdAt: artifact.createdAt.toISOString()
      })),
      approval: run.approval
        ? {
            decision: run.approval.decision,
            comment: run.approval.comment ?? null,
            approverName: run.approval.approverMember.name,
            decidedAt: run.approval.decidedAt.toISOString()
          }
        : null
    };
  }

  private mapEventTimelineItem(event: Event): EventTimelineItem {
    return {
      id: event.id,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      actorType: event.actorType,
      actorId: event.actorId,
      traceId: event.traceId,
      occurredAt: event.occurredAt.toISOString(),
      summary: summarizeEvent(event)
    };
  }
}

function summarizeEvent(event: Event): string {
  const payload = parsePayload(event.payloadJson);

  switch (event.eventType) {
    case "project.created":
      return `项目 ${String(payload.name ?? "")} 已创建`;
    case "workflow.triggered":
      return `模板 ${String(payload.templateName ?? "工作流")} 已触发`;
    case "task.created":
      return `新任务：${String(payload.title ?? "未命名任务")}`;
    case "run.queued":
      return "Run 已进入执行队列";
    case "run.started":
      return "Worker 已接管 Run 并开始执行";
    case "artifact.created":
      return `生成产物：${String(payload.title ?? "交付摘要")}`;
    case "run.waiting_approval":
      return "Run 已进入待审批状态";
    case "approval.approved":
      return "审批已通过";
    case "approval.rejected":
      return "审批被驳回";
    case "run.succeeded":
      return "Run 已成功闭环";
    case "run.failed":
      return "Run 已进入失败态";
    case "task.completed":
      return "任务已完成";
    case "task.reopened":
      return "任务被退回重新处理";
    case "task.seeded":
      return "演示任务已预置";
    default:
      return event.eventType;
  }
}

function stringifyPayload(value: Record<string, unknown>) {
  return JSON.stringify(value);
}

function parsePayload(value: string | null): Record<string, unknown> {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}
