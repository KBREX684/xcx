import { createHmac } from "node:crypto";

export function createWebhookSignature(secret: string, rawBody: string) {
  return `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
}
