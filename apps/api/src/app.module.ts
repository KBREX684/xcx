import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { PrismaService } from "./prisma.service";
import { ControlPlaneService } from "./control-plane.service";
import { ProjectsController } from "./projects.controller";
import { RunsController } from "./runs.controller";
import { DashboardController } from "./dashboard.controller";
import { TasksController } from "./tasks.controller";
import { ApprovalsController } from "./approvals.controller";
import { ArtifactsController } from "./artifacts.controller";
import { AgentsController } from "./agents.controller";
import { WorkflowsController } from "./workflows.controller";
import { CertificatesController } from "./certificates.controller";
import { SettingsController } from "./settings.controller";

@Module({
  controllers: [
    HealthController,
    DashboardController,
    ProjectsController,
    RunsController,
    TasksController,
    ApprovalsController,
    ArtifactsController,
    AgentsController,
    WorkflowsController,
    CertificatesController,
    SettingsController
  ],
  providers: [PrismaService, ControlPlaneService]
})
export class AppModule {}
