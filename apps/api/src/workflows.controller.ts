import { Controller, Get, Inject, Param } from "@nestjs/common";
import { ControlPlaneService } from "./control-plane.service";

@Controller("/api/v1/workflows")
export class WorkflowsController {
  constructor(@Inject(ControlPlaneService) private readonly service: ControlPlaneService) {}

  @Get()
  async listWorkflows() {
    return this.service.listWorkflowTemplates();
  }

  @Get(":templateId")
  async getWorkflow(@Param("templateId") templateId: string) {
    return this.service.getWorkflowTemplateDetail(templateId);
  }
}
