import { Body, Controller, Get, Inject, Param, Post, Put, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { ControlPlaneService } from "./control-plane.service";
import { resolveTraceId } from "./trace";

@Controller("/api/v1/projects")
export class ProjectsController {
  constructor(@Inject(ControlPlaneService) private readonly service: ControlPlaneService) {}

  @Get()
  async listProjects(@Query("status") status?: string, @Query("q") q?: string) {
    return this.service.listProjects({ status, q });
  }

  @Get(":projectId")
  async getProject(@Param("projectId") projectId: string) {
    return this.service.getProjectDetail(projectId);
  }

  @Post()
  async createProject(@Body() body: unknown, @Req() request: Request) {
    return this.service.createProject(body as never, resolveTraceId(request));
  }

  @Put(":projectId")
  async updateProject(@Param("projectId") projectId: string, @Body() body: unknown, @Req() request: Request) {
    return this.service.updateProject(projectId, body as never, resolveTraceId(request));
  }

  @Get(":projectId/tasks")
  async listTasks(@Param("projectId") projectId: string) {
    return this.service.listProjectTasks(projectId);
  }

  @Post(":projectId/tasks")
  async createTask(@Param("projectId") projectId: string, @Body() body: unknown, @Req() request: Request) {
    return this.service.createTask(projectId, body as never, resolveTraceId(request));
  }

  @Post(":projectId/workflows/:templateId/trigger")
  async triggerWorkflow(
    @Param("projectId") projectId: string,
    @Param("templateId") templateId: string,
    @Req() request: Request
  ) {
    return this.service.triggerWorkflow(projectId, templateId, resolveTraceId(request));
  }

  @Get(":projectId/artifacts")
  async listArtifacts(@Param("projectId") projectId: string) {
    return this.service.listArtifacts(projectId);
  }

  @Get(":projectId/events")
  async listEvents(@Param("projectId") projectId: string) {
    return this.service.listEvents(projectId);
  }
}
