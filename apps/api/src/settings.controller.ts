import { Body, Controller, Get, Inject, Put, Req } from "@nestjs/common";
import type { Request } from "express";
import { ControlPlaneService } from "./control-plane.service";
import { resolveTraceId } from "./trace";

@Controller("/api/v1/settings")
export class SettingsController {
  constructor(@Inject(ControlPlaneService) private readonly service: ControlPlaneService) {}

  @Get("integrations")
  async getIntegrations() {
    return this.service.getIntegrationConfig();
  }

  @Put("integrations")
  async updateIntegrations(@Body() body: unknown, @Req() request: Request) {
    return this.service.updateIntegrationConfig(body as never, resolveTraceId(request));
  }
}
