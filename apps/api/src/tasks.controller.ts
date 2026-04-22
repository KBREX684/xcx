import { Controller, Get, Inject, Param } from "@nestjs/common";
import { ControlPlaneService } from "./control-plane.service";

@Controller("/api/v1/tasks")
export class TasksController {
  constructor(@Inject(ControlPlaneService) private readonly service: ControlPlaneService) {}

  @Get(":taskId")
  async getTask(@Param("taskId") taskId: string) {
    return this.service.getTaskDetail(taskId);
  }
}
