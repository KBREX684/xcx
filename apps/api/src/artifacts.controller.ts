import { Controller, Get, Inject, Param } from "@nestjs/common";
import { ControlPlaneService } from "./control-plane.service";

@Controller("/api/v1/artifacts")
export class ArtifactsController {
  constructor(@Inject(ControlPlaneService) private readonly service: ControlPlaneService) {}

  @Get(":artifactId")
  async getArtifact(@Param("artifactId") artifactId: string) {
    return this.service.getArtifactDetail(artifactId);
  }
}
