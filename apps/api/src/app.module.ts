import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { PrismaService } from "./prisma.service";
import { ControlPlaneService } from "./control-plane.service";
import { ProjectsController } from "./projects.controller";
import { RunsController } from "./runs.controller";

@Module({
  controllers: [HealthController, ProjectsController, RunsController],
  providers: [PrismaService, ControlPlaneService]
})
export class AppModule {}

