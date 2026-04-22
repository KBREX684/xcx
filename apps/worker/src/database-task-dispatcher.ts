import { bootstrapContext } from "@agent-control-plane/config";
import { type ClaimedRun, type StoredArtifact, type TaskDispatcherPort, taskStatusOnRunAwaitingApproval } from "@agent-control-plane/domain";
import { ActorType, PrismaClient } from "@prisma/client";

export class DatabaseTaskDispatcher implements TaskDispatcherPort {
  constructor(private readonly prisma: PrismaClient) {}

  async claimNextRun(): Promise<ClaimedRun | null> {
    const queuedRun = await this.prisma.run.findFirst({
      where: { status: "queued" },
      include: {
        task: true
      },
      orderBy: { createdAt: "asc" }
    });

    if (!queuedRun) {
      return null;
    }

    const claimed = await this.prisma.run.updateMany({
      where: {
        id: queuedRun.id,
        status: "queued"
      },
      data: {
        status: "running",
        startedAt: new Date()
      }
    });

    if (claimed.count === 0) {
      return null;
    }

    await this.prisma.event.create({
      data: {
        workspaceId: bootstrapContext.workspaceId,
        projectId: queuedRun.projectId,
        entityType: "run",
        entityId: queuedRun.id,
        eventType: "run.started",
        actorType: ActorType.worker,
        actorId: "worker-local",
        traceId: queuedRun.traceId,
        payloadJson: JSON.stringify({
          taskId: queuedRun.taskId
        })
      }
    });

    return {
      runId: queuedRun.id,
      projectId: queuedRun.projectId,
      taskId: queuedRun.taskId,
      traceId: queuedRun.traceId,
      prompt: String(parsePayload(queuedRun.inputPayload).prompt ?? queuedRun.task.description)
    };
  }

  async markWaitingApproval(input: {
    runId: string;
    taskId: string;
    outputSummary: string;
    artifacts: StoredArtifact[];
  }): Promise<void> {
    const run = await this.prisma.run.findUnique({
      where: { id: input.runId }
    });

    if (!run) {
      throw new Error(`Run ${input.runId} not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.run.update({
        where: { id: input.runId },
        data: {
          status: "waiting_approval",
          outputSummary: input.outputSummary
        }
      });

      await tx.task.update({
        where: { id: input.taskId },
        data: {
          status: taskStatusOnRunAwaitingApproval()
        }
      });

      await tx.artifact.createMany({
        data: input.artifacts.map((artifact) => ({
          projectId: run.projectId,
          runId: input.runId,
          artifactType: artifact.artifactType,
          title: artifact.title,
          storageUri: artifact.storageUri,
          mimeType: artifact.mimeType,
          sha256Digest: artifact.sha256Digest,
          metadataJson: artifact.metadata ? JSON.stringify(artifact.metadata) : null
        }))
      });

      await tx.event.createMany({
        data: [
          ...input.artifacts.map((artifact) => ({
            workspaceId: bootstrapContext.workspaceId,
            projectId: run.projectId,
            entityType: "artifact",
            entityId: input.runId,
            eventType: "artifact.created",
            actorType: ActorType.worker,
            actorId: "worker-local",
            traceId: run.traceId,
            payloadJson: JSON.stringify({
              title: artifact.title
            })
          })),
          {
            workspaceId: bootstrapContext.workspaceId,
            projectId: run.projectId,
            entityType: "run",
            entityId: input.runId,
            eventType: "run.waiting_approval",
            actorType: ActorType.worker,
            actorId: "worker-local",
            traceId: run.traceId,
            payloadJson: JSON.stringify({
              taskId: input.taskId
            })
          }
        ]
      });
    });
  }

  async markFailed(runId: string, taskId: string, message: string): Promise<void> {
    const run = await this.prisma.run.findUnique({
      where: { id: runId }
    });

    if (!run) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.run.update({
        where: { id: runId },
        data: {
          status: "failed",
          errorMessage: message,
          finishedAt: new Date()
        }
      });

      await tx.task.update({
        where: { id: taskId },
        data: {
          status: "blocked",
          blockedReason: message
        }
      });

      await tx.event.create({
        data: {
          workspaceId: bootstrapContext.workspaceId,
          projectId: run.projectId,
          entityType: "run",
          entityId: runId,
          eventType: "run.failed",
          actorType: ActorType.worker,
          actorId: "worker-local",
          traceId: run.traceId,
          payloadJson: JSON.stringify({
            error: message
          })
        }
      });
    });
  }
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
