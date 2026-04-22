import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { bootstrapContext } from "@agent-control-plane/config";
import {
  applyApprovalDecision,
  approvalDecisionInputSchema,
  createProjectInputSchema,
  createTaskInputSchema,
  DEFAULT_WORKFLOW_TEMPLATE,
  projectStatuses,
  updateIntegrationConfigInputSchema,
  updateProjectSettingsInputSchema,
  type AgentDetail,
  type AgentSummary,
  type ApprovalCenterData,
  type ApprovalDecision,
  type ApprovalDecisionInput,
  type ApprovalHistoryItem,
  type ApprovalQueueItem,
  type ArtifactDetail,
  type ArtifactListItem,
  type CertificateSummary,
  type CreateProjectInput,
  type CreateTaskInput,
  type DashboardSummary,
  type EventTimelineItem,
  type IntegrationConfigView,
  type ProjectDetail,
  type ProjectSettingsInput,
  type ProjectSummary,
  type RunDetail,
  type RunListItem,
  type TaskBoardItem,
  type TaskDetail,
  type UpdateIntegrationConfigInput,
  type WorkflowTemplateDetail,
  type WorkflowTemplateListItem,
  type WorkflowTemplateNode
} from "@agent-control-plane/domain";
import {
  ActorType,
  type Agent,
  type Approval,
  type Artifact,
  type Certificate,
  type Event,
  type Member,
  type Project,
  type Run,
  type Task,
  type WorkflowTemplate,
  type WorkspaceIntegrationConfig
} from "@prisma/client";
import { PrismaService } from "./prisma.service";

type ProjectSummaryRelations = Project & {
  tasks: Task[];
  runs: Run[];
  events: Event[];
};

type ProjectDetailRelations = ProjectSummaryRelations & {
  ownerMember: Member;
  certificates: Certificate[];
};

type TaskBoardRelations = Task & {
  ownerAgent: { name: string } | null;
  ownerMember: { name: string } | null;
  runs: Run[];
};

type TaskDetailRelations = Task & {
  project: Project;
  sourceTemplate: { name: string } | null;
  ownerAgent: { name: string } | null;
  ownerMember: { name: string } | null;
  runs: Array<Run & { agent: { name: string } }>;
};

type RunDetailRelations = Run & {
  project: { name: string; projectCode: string };
  task: { title: string };
  agent: { name: string };
  artifacts: Artifact[];
  approval: (Approval & { approverMember: { name: string } }) | null;
};

type ArtifactDetailRelations = Artifact & {
  project: { name: string };
  run: { status: Run["status"]; outputSummary: string | null };
};

type ApprovalHistoryRelations = Approval & {
  project: { name: string };
  task: { title: string };
  run: { traceId: string };
  approverMember: { name: string };
};

type PendingApprovalRunRelations = Run & {
  project: { name: string; projectCode: string };
  task: { title: string };
  agent: { name: string };
};

type AgentSummaryRelations = Agent & {
  _count: {
    ownedTasks: number;
    runs: number;
  };
};

type AgentDetailRelations = Agent & {
  ownedTasks: Array<
    Task & {
      ownerAgent: { name: string } | null;
      ownerMember: { name: string } | null;
      runs: Run[];
    }
  >;
  runs: Array<
    Run & {
      task: { title: string };
    }
  >;
};

type WorkflowTemplateSummaryRelations = WorkflowTemplate & {
  _count: {
    tasks: number;
    runs: number;
  };
  runs: Run[];
};

type WorkflowTemplateDetailRelations = WorkflowTemplate & {
  _count: {
    tasks: number;
    runs: number;
  };
  runs: Run[];
};

type CertificateRelations = Certificate & {
  project: { name: string };
};

@Injectable()
export class ControlPlaneService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getDashboardSummary(): Promise<DashboardSummary> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: bootstrapContext.workspaceId },
      select: { name: true }
    });

    if (!workspace) {
      throw new NotFoundException("Workspace not found");
    }

    const [
      totalProjectCount,
      activeProjectCount,
      pendingApprovalCount,
      runningExecutionCount,
      activeAgentCount,
      spotlightProjects,
      pendingApprovals,
      recentEvents,
      certificateHighlights
    ] = await Promise.all([
      this.prisma.project.count({
        where: { workspaceId: bootstrapContext.workspaceId }
      }),
      this.prisma.project.count({
        where: { workspaceId: bootstrapContext.workspaceId, status: "active" }
      }),
      this.prisma.run.count({
        where: {
          project: { workspaceId: bootstrapContext.workspaceId },
          status: "waiting_approval"
        }
      }),
      this.prisma.run.count({
        where: {
          project: { workspaceId: bootstrapContext.workspaceId },
          status: "running"
        }
      }),
      this.prisma.agent.count({
        where: {
          workspaceId: bootstrapContext.workspaceId,
          status: "active"
        }
      }),
      this.prisma.project.findMany({
        where: { workspaceId: bootstrapContext.workspaceId },
        include: {
          tasks: true,
          runs: true,
          events: {
            orderBy: { occurredAt: "desc" },
            take: 1
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 4
      }),
      this.prisma.run.findMany({
        where: {
          project: { workspaceId: bootstrapContext.workspaceId },
          status: "waiting_approval"
        },
        include: {
          project: { select: { name: true, projectCode: true } },
          task: { select: { title: true } },
          agent: { select: { name: true } }
        },
        orderBy: { updatedAt: "desc" },
        take: 6
      }),
      this.prisma.event.findMany({
        where: { workspaceId: bootstrapContext.workspaceId },
        orderBy: { occurredAt: "desc" },
        take: 8
      }),
      this.prisma.certificate.findMany({
        where: {
          project: { workspaceId: bootstrapContext.workspaceId }
        },
        include: {
          project: { select: { name: true } }
        },
        orderBy: { updatedAt: "desc" },
        take: 4
      })
    ]);

    return {
      workspaceName: workspace.name,
      totalProjectCount,
      activeProjectCount,
      pendingApprovalCount,
      runningExecutionCount,
      activeAgentCount,
      spotlightProjects: spotlightProjects.map((project) => this.mapProjectSummary(project)),
      pendingApprovals: pendingApprovals.map((run) => this.mapApprovalQueueItem(run)),
      recentEvents: recentEvents.map((event) => this.mapEventTimelineItem(event)),
      certificateHighlights: certificateHighlights.map((certificate) => this.mapCertificateSummary(certificate))
    };
  }

  async listProjects(filters?: { status?: string; q?: string }): Promise<ProjectSummary[]> {
    const normalizedStatus = filters?.status?.trim();
    if (normalizedStatus && !projectStatuses.includes(normalizedStatus as (typeof projectStatuses)[number])) {
      throw new BadRequestException("Invalid project status filter");
    }

    const normalizedQuery = filters?.q?.trim();

    const projects = await this.prisma.project.findMany({
      where: {
        workspaceId: bootstrapContext.workspaceId,
        ...(normalizedStatus ? { status: normalizedStatus as Project["status"] } : {}),
        ...(normalizedQuery
          ? {
              OR: [
                { name: { contains: normalizedQuery } },
                { projectCode: { contains: normalizedQuery } },
                { customerName: { contains: normalizedQuery } }
              ]
            }
          : {})
      },
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

  async getProjectDetail(projectId: string): Promise<ProjectDetail> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId: bootstrapContext.workspaceId
      },
      include: {
        ownerMember: true,
        tasks: true,
        runs: true,
        events: {
          orderBy: { occurredAt: "desc" },
          take: 1
        },
        certificates: {
          orderBy: { updatedAt: "desc" },
          take: 1
        }
      }
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    return this.mapProjectDetail(project);
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

    const hydrated = await this.prisma.project.findFirst({
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

  async updateProject(projectId: string, input: ProjectSettingsInput, traceId: string): Promise<ProjectDetail> {
    await this.ensureProject(projectId);

    const parsed = updateProjectSettingsInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const normalizedDate = normalizeDateInput(parsed.data.targetDeliveryAt);

    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        name: parsed.data.name,
        customerName: parsed.data.customerName,
        targetDeliveryAt: normalizedDate,
        status: parsed.data.status
      }
    });

    await this.recordEvent({
      projectId,
      entityType: "project",
      entityId: projectId,
      eventType: "project.updated",
      actorType: "member",
      actorId: bootstrapContext.ownerMemberId,
      traceId,
      payloadJson: stringifyPayload({
        name: parsed.data.name,
        customerName: parsed.data.customerName,
        targetDeliveryAt: normalizedDate?.toISOString() ?? null,
        status: parsed.data.status ?? null
      })
    });

    return this.getProjectDetail(projectId);
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

  async getTaskDetail(taskId: string): Promise<TaskDetail> {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        project: { workspaceId: bootstrapContext.workspaceId }
      },
      include: {
        project: true,
        sourceTemplate: { select: { name: true } },
        ownerAgent: { select: { name: true } },
        ownerMember: { select: { name: true } },
        runs: {
          include: {
            agent: { select: { name: true } }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    return this.mapTaskDetail(task);
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
    const run = await this.prisma.run.findFirst({
      where: {
        id: runId,
        project: { workspaceId: bootstrapContext.workspaceId }
      },
      include: {
        project: { select: { name: true, projectCode: true } },
        task: { select: { title: true } },
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

    return artifacts.map((artifact) => this.mapArtifactListItem(artifact));
  }

  async getArtifactDetail(artifactId: string): Promise<ArtifactDetail> {
    const artifact = await this.prisma.artifact.findFirst({
      where: {
        id: artifactId,
        project: { workspaceId: bootstrapContext.workspaceId }
      },
      include: {
        project: { select: { name: true } },
        run: { select: { status: true, outputSummary: true } }
      }
    });

    if (!artifact) {
      throw new NotFoundException("Artifact not found");
    }

    return {
      id: artifact.id,
      projectId: artifact.projectId,
      projectName: artifact.project.name,
      runId: artifact.runId,
      title: artifact.title,
      artifactType: artifact.artifactType,
      storageUri: artifact.storageUri,
      mimeType: artifact.mimeType,
      sha256Digest: artifact.sha256Digest,
      createdAt: artifact.createdAt.toISOString(),
      runStatus: artifact.run.status,
      outputSummary: artifact.run.outputSummary ?? null,
      metadata: parsePayload(artifact.metadataJson)
    };
  }

  async listEvents(projectId: string): Promise<EventTimelineItem[]> {
    await this.ensureProject(projectId);

    const events = await this.prisma.event.findMany({
      where: { projectId },
      orderBy: { occurredAt: "desc" },
      take: 40
    });

    return events.map((event) => this.mapEventTimelineItem(event));
  }

  async listApprovals(): Promise<ApprovalCenterData> {
    const [pendingRuns, history] = await Promise.all([
      this.prisma.run.findMany({
        where: {
          project: { workspaceId: bootstrapContext.workspaceId },
          status: "waiting_approval"
        },
        include: {
          project: { select: { name: true, projectCode: true } },
          task: { select: { title: true } },
          agent: { select: { name: true } }
        },
        orderBy: { updatedAt: "desc" }
      }),
      this.prisma.approval.findMany({
        where: {
          project: { workspaceId: bootstrapContext.workspaceId }
        },
        include: {
          project: { select: { name: true } },
          task: { select: { title: true } },
          run: { select: { traceId: true } },
          approverMember: { select: { name: true } }
        },
        orderBy: { decidedAt: "desc" },
        take: 20
      })
    ]);

    return {
      pending: pendingRuns.map((run) => this.mapApprovalQueueItem(run)),
      history: history.map((item) => this.mapApprovalHistoryItem(item))
    };
  }

  async listAgents(): Promise<AgentSummary[]> {
    const agents = await this.prisma.agent.findMany({
      where: { workspaceId: bootstrapContext.workspaceId },
      include: {
        _count: {
          select: {
            ownedTasks: true,
            runs: true
          }
        }
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
    });

    return agents.map((agent) => this.mapAgentSummary(agent));
  }

  async getAgentDetail(agentId: string): Promise<AgentDetail> {
    const agent = await this.prisma.agent.findFirst({
      where: {
        id: agentId,
        workspaceId: bootstrapContext.workspaceId
      },
      include: {
        ownedTasks: {
          include: {
            ownerAgent: { select: { name: true } },
            ownerMember: { select: { name: true } },
            runs: {
              orderBy: { createdAt: "desc" },
              take: 1
            }
          },
          orderBy: { updatedAt: "desc" },
          take: 6
        },
        runs: {
          include: {
            task: { select: { title: true } }
          },
          orderBy: { createdAt: "desc" },
          take: 8
        }
      }
    });

    if (!agent) {
      throw new NotFoundException("Agent not found");
    }

    return this.mapAgentDetail(agent);
  }

  async listWorkflowTemplates(): Promise<WorkflowTemplateListItem[]> {
    const templates = await this.prisma.workflowTemplate.findMany({
      where: { workspaceId: bootstrapContext.workspaceId },
      include: {
        _count: {
          select: {
            tasks: true,
            runs: true
          }
        },
        runs: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return templates.map((template) => this.mapWorkflowTemplateListItem(template));
  }

  async getWorkflowTemplateDetail(templateId: string): Promise<WorkflowTemplateDetail> {
    const template = await this.prisma.workflowTemplate.findFirst({
      where: {
        id: templateId,
        workspaceId: bootstrapContext.workspaceId
      },
      include: {
        _count: {
          select: {
            tasks: true,
            runs: true
          }
        },
        runs: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    if (!template) {
      throw new NotFoundException("Workflow template not found");
    }

    return {
      ...this.mapWorkflowTemplateListItem(template),
      nodes: parseNodes(template.nodesJson)
    };
  }

  async listCertificates(): Promise<CertificateSummary[]> {
    const certificates = await this.prisma.certificate.findMany({
      where: {
        project: { workspaceId: bootstrapContext.workspaceId }
      },
      include: {
        project: { select: { name: true } }
      },
      orderBy: { updatedAt: "desc" }
    });

    return certificates.map((certificate) => this.mapCertificateSummary(certificate));
  }

  async getIntegrationConfig(): Promise<IntegrationConfigView> {
    const config = await this.prisma.workspaceIntegrationConfig.upsert({
      where: { workspaceId: bootstrapContext.workspaceId },
      update: {},
      create: {
        workspaceId: bootstrapContext.workspaceId,
        defaultExecutorType: "mock",
        objectStorageProvider: "local-file",
        notificationChannel: "none",
        approvalMode: "manual"
      }
    });

    return this.mapIntegrationConfig(config);
  }

  async updateIntegrationConfig(input: UpdateIntegrationConfigInput, traceId: string): Promise<IntegrationConfigView> {
    const parsed = updateIntegrationConfigInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const config = await this.prisma.workspaceIntegrationConfig.upsert({
      where: { workspaceId: bootstrapContext.workspaceId },
      update: {
        defaultExecutorType: parsed.data.defaultExecutorType,
        objectStorageProvider: parsed.data.objectStorageProvider,
        notificationChannel: parsed.data.notificationChannel,
        callbackBaseUrl: normalizeNullableString(parsed.data.callbackBaseUrl),
        agentEndpoint: normalizeNullableString(parsed.data.agentEndpoint),
        approvalMode: parsed.data.approvalMode
      },
      create: {
        workspaceId: bootstrapContext.workspaceId,
        defaultExecutorType: parsed.data.defaultExecutorType,
        objectStorageProvider: parsed.data.objectStorageProvider,
        notificationChannel: parsed.data.notificationChannel,
        callbackBaseUrl: normalizeNullableString(parsed.data.callbackBaseUrl),
        agentEndpoint: normalizeNullableString(parsed.data.agentEndpoint),
        approvalMode: parsed.data.approvalMode
      }
    });

    await this.recordEvent({
      entityType: "integration",
      entityId: config.id,
      eventType: "integration.updated",
      actorType: "member",
      actorId: bootstrapContext.ownerMemberId,
      traceId,
      payloadJson: stringifyPayload({
        defaultExecutorType: config.defaultExecutorType,
        objectStorageProvider: config.objectStorageProvider,
        notificationChannel: config.notificationChannel
      })
    });

    return this.mapIntegrationConfig(config);
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

    const run = await this.prisma.run.findFirst({
      where: {
        id: runId,
        project: { workspaceId: bootstrapContext.workspaceId }
      },
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
    projectId?: string;
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

  private mapProjectSummary(project: ProjectSummaryRelations): ProjectSummary {
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

  private mapProjectDetail(project: ProjectDetailRelations): ProjectDetail {
    const latestEvent = project.events[0] ?? null;
    const latestCertificate = project.certificates[0] ?? null;

    return {
      ...this.mapProjectSummary(project),
      ownerName: project.ownerMember.name,
      currentCertificateId: project.currentCertificateId ?? null,
      latestCertificate: latestCertificate ? this.mapCertificateSummary({ ...latestCertificate, project: { name: project.name } }) : null,
      latestEventSummary: latestEvent ? summarizeEvent(latestEvent) : null
    };
  }

  private mapTaskBoardItem(task: TaskBoardRelations): TaskBoardItem {
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

  private mapTaskDetail(task: TaskDetailRelations): TaskDetail {
    return {
      ...this.mapTaskBoardItem(task),
      projectId: task.projectId,
      sourceTemplateName: task.sourceTemplate?.name ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      runs: task.runs.map((run) => this.mapRunListItem(run, run.agent.name, task.title))
    };
  }

  private mapRunListItem(
    run: Pick<Run, "id" | "status" | "outputSummary" | "traceId" | "createdAt" | "startedAt" | "finishedAt">,
    agentName: string,
    taskTitle: string
  ): RunListItem {
    return {
      id: run.id,
      status: run.status,
      agentName,
      taskTitle,
      outputSummary: run.outputSummary ?? null,
      traceId: run.traceId,
      createdAt: run.createdAt.toISOString(),
      startedAt: run.startedAt?.toISOString() ?? null,
      finishedAt: run.finishedAt?.toISOString() ?? null
    };
  }

  private mapRunDetail(run: RunDetailRelations): RunDetail {
    return {
      id: run.id,
      projectId: run.projectId,
      projectName: run.project.name,
      projectCode: run.project.projectCode,
      taskId: run.taskId,
      taskTitle: run.task.title,
      nodeKey: run.nodeKey,
      agentName: run.agent.name,
      status: run.status,
      traceId: run.traceId,
      inputPayload: run.inputPayload ?? null,
      outputSummary: run.outputSummary ?? null,
      errorMessage: run.errorMessage ?? null,
      startedAt: run.startedAt?.toISOString() ?? null,
      finishedAt: run.finishedAt?.toISOString() ?? null,
      artifacts: run.artifacts.map((artifact) => this.mapArtifactListItem(artifact)),
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

  private mapArtifactListItem(artifact: Artifact): ArtifactListItem {
    return {
      id: artifact.id,
      title: artifact.title,
      artifactType: artifact.artifactType,
      storageUri: artifact.storageUri,
      mimeType: artifact.mimeType,
      sha256Digest: artifact.sha256Digest,
      createdAt: artifact.createdAt.toISOString()
    };
  }

  private mapApprovalQueueItem(run: PendingApprovalRunRelations): ApprovalQueueItem {
    return {
      runId: run.id,
      taskId: run.taskId,
      projectId: run.projectId,
      projectName: run.project.name,
      projectCode: run.project.projectCode,
      taskTitle: run.task.title,
      agentName: run.agent.name,
      requestedAt: run.updatedAt.toISOString(),
      outputSummary: run.outputSummary ?? null,
      traceId: run.traceId
    };
  }

  private mapApprovalHistoryItem(item: ApprovalHistoryRelations): ApprovalHistoryItem {
    return {
      runId: item.runId,
      taskId: item.taskId,
      projectId: item.projectId,
      projectName: item.project.name,
      taskTitle: item.task.title,
      decision: item.decision,
      comment: item.comment ?? null,
      approverName: item.approverMember.name,
      decidedAt: item.decidedAt.toISOString(),
      traceId: item.run.traceId
    };
  }

  private mapAgentSummary(agent: AgentSummaryRelations): AgentSummary {
    return {
      id: agent.id,
      name: agent.name,
      roleName: agent.roleName,
      adapterType: agent.adapterType,
      status: agent.status,
      healthStatus: agent.healthStatus,
      description: agent.description,
      lastSeenAt: agent.lastSeenAt?.toISOString() ?? null,
      taskCount: agent._count.ownedTasks,
      runCount: agent._count.runs
    };
  }

  private mapAgentDetail(agent: AgentDetailRelations): AgentDetail {
    return {
      id: agent.id,
      name: agent.name,
      roleName: agent.roleName,
      adapterType: agent.adapterType,
      status: agent.status,
      healthStatus: agent.healthStatus,
      description: agent.description,
      lastSeenAt: agent.lastSeenAt?.toISOString() ?? null,
      taskCount: agent.ownedTasks.length,
      runCount: agent.runs.length,
      tags: parseStringList(agent.tags),
      recentRuns: agent.runs.map((run) => this.mapRunListItem(run, agent.name, run.task.title)),
      ownedTasks: agent.ownedTasks.map((task) => this.mapTaskBoardItem(task))
    };
  }

  private mapWorkflowTemplateListItem(template: WorkflowTemplateSummaryRelations): WorkflowTemplateListItem {
    return {
      id: template.id,
      name: template.name,
      scenarioType: template.scenarioType,
      version: template.version,
      triggerType: template.triggerType,
      status: template.status,
      nodeCount: parseNodes(template.nodesJson).length,
      usageCount: template._count.runs,
      lastTriggeredAt: template.runs[0]?.createdAt.toISOString() ?? null
    };
  }

  private mapCertificateSummary(certificate: CertificateRelations): CertificateSummary {
    return {
      id: certificate.id,
      projectId: certificate.projectId,
      projectName: certificate.project.name,
      title: certificate.title,
      status: certificate.status,
      verificationCode: certificate.verificationCode,
      generatedAt: certificate.generatedAt.toISOString(),
      updatedAt: certificate.updatedAt.toISOString()
    };
  }

  private mapIntegrationConfig(config: WorkspaceIntegrationConfig): IntegrationConfigView {
    return {
      workspaceId: config.workspaceId,
      defaultExecutorType: config.defaultExecutorType as IntegrationConfigView["defaultExecutorType"],
      objectStorageProvider: config.objectStorageProvider as IntegrationConfigView["objectStorageProvider"],
      notificationChannel: config.notificationChannel as IntegrationConfigView["notificationChannel"],
      callbackBaseUrl: config.callbackBaseUrl ?? null,
      agentEndpoint: config.agentEndpoint ?? null,
      approvalMode: config.approvalMode as IntegrationConfigView["approvalMode"],
      updatedAt: config.updatedAt.toISOString()
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
    case "project.created": {
      const projectName = getPayloadText(payload, "name");
      return projectName ? `项目 ${projectName} 已创建` : "项目已创建";
    }
    case "project.updated":
      return "项目设置已更新";
    case "workflow.triggered": {
      const templateName = getPayloadText(payload, "templateName") ?? "未命名模板";
      return `流程模板 ${templateName} 已触发`;
    }
    case "task.created": {
      const taskTitle = getPayloadText(payload, "title") ?? "未命名任务";
      return `新任务：${taskTitle}`;
    }
    case "run.queued":
      return "执行记录已进入排队状态";
    case "run.started":
      return "执行记录已开始处理";
    case "artifact.created": {
      const artifactTitle = getPayloadText(payload, "title") ?? "交付摘要";
      return `生成交付产物：${artifactTitle}`;
    }
    case "run.waiting_approval":
      return "执行记录已进入待审批状态";
    case "approval.approved":
      return "审批已通过";
    case "approval.rejected":
      return "审批已驳回";
    case "run.succeeded":
      return "执行记录已成功闭环";
    case "run.failed":
      return "执行记录已进入失败态";
    case "task.completed":
      return "任务已完成";
    case "task.reopened":
      return "任务被退回重新处理";
    case "task.seeded":
      return "演示任务已预置";
    case "integration.updated":
      return "接入配置已更新";
    default:
      return event.eventType;
  }
}

function stringifyPayload(value: Record<string, unknown>) {
  return JSON.stringify(value);
}

function parsePayload(value: string | null): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getPayloadText(payload: Record<string, unknown> | null, key: string): string | null {
  if (!payload) {
    return null;
  }

  const value = payload[key];
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseNodes(value: string): WorkflowTemplateNode[] {
  try {
    return JSON.parse(value) as WorkflowTemplateNode[];
  } catch {
    return [];
  }
}

function parseStringList(value: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeDateInput(value: string | undefined): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(normalized.getTime())) {
    throw new BadRequestException("目标日期格式无效");
  }

  return normalized;
}

function normalizeNullableString(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
