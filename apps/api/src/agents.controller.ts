import { Controller, Get, Inject, Param } from "@nestjs/common";
import { ControlPlaneService } from "./control-plane.service";

@Controller("/api/v1/agents")
export class AgentsController {
  constructor(@Inject(ControlPlaneService) private readonly service: ControlPlaneService) {}

  @Get()
  async listAgents() {
    return this.service.listAgents();
  }

  @Get(":agentId")
  async getAgent(@Param("agentId") agentId: string) {
    return this.service.getAgentDetail(agentId);
  }
}
