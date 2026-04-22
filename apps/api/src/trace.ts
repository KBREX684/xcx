import { randomUUID } from "node:crypto";
import type { Request } from "express";

export function resolveTraceId(request: Request): string {
  const header = request.headers["x-trace-id"];
  if (typeof header === "string" && header.trim().length > 0) {
    return header;
  }

  return randomUUID();
}

