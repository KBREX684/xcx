import { Body, Controller, Get, Inject, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { ControlPlaneService } from "./control-plane.service";
import { resolveTraceId } from "./trace";

@Controller("/api/v1/runs")
export class RunsController {
  constructor(@Inject(ControlPlaneService) private readonly service: ControlPlaneService) {}

  @Get(":runId")
  async getRun(@Param("runId") runId: string) {
    return this.service.getRun(runId);
  }

  @Post(":runId/approve")
  async approveRun(@Param("runId") runId: string, @Body() body: unknown, @Req() request: Request) {
    return this.service.approveRun(runId, body as never, resolveTraceId(request));
  }

  @Post(":runId/reject")
  async rejectRun(@Param("runId") runId: string, @Body() body: unknown, @Req() request: Request) {
    return this.service.rejectRun(runId, body as never, resolveTraceId(request));
  }
}

