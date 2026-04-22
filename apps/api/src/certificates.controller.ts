import { Controller, Get, Inject } from "@nestjs/common";
import { ControlPlaneService } from "./control-plane.service";

@Controller("/api/v1/certificates")
export class CertificatesController {
  constructor(@Inject(ControlPlaneService) private readonly service: ControlPlaneService) {}

  @Get()
  async listCertificates() {
    return this.service.listCertificates();
  }
}
