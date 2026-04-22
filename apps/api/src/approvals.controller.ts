import { Controller, Get, Inject } from "@nestjs/common";
import { ControlPlaneService } from "./control-plane.service";

@Controller("/api/v1/approvals")
export class ApprovalsController {
  constructor(@Inject(ControlPlaneService) private readonly service: ControlPlaneService) {}

  @Get()
  async listApprovals() {
    return this.service.listApprovals();
  }
}
