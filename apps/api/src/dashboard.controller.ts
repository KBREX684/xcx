import { Controller, Get, Inject } from "@nestjs/common";
import { ControlPlaneService } from "./control-plane.service";

@Controller("/api/v1/dashboard")
export class DashboardController {
  constructor(@Inject(ControlPlaneService) private readonly service: ControlPlaneService) {}

  @Get()
  async getDashboard() {
    return this.service.getDashboardSummary();
  }
}
