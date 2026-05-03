// 会话/设备列表服务：复用 Web 端 /api/v1/auth/sessions[/:id/revoke]。
// "退出其他设备" 由 UI 遍历列表中非当前 session 调用 revoke。

import { z } from "zod";
import { apiClient } from "./apiClient";

export const sessionItemSchema = z.object({
  id: z.string(),
  current: z.boolean().optional(),
  ip: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  lastActiveAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  revokedAt: z.string().nullable().optional(),
});

export type SessionItem = z.infer<typeof sessionItemSchema>;

const sessionListSchema = z.array(sessionItemSchema);

export const sessionService = {
  list() {
    return apiClient.request<SessionItem[]>({
      path: "/api/v1/auth/sessions",
      schema: sessionListSchema,
    });
  },
  revoke(sessionId: string) {
    return apiClient.request({
      path: `/api/v1/auth/sessions/${encodeURIComponent(sessionId)}/revoke`,
      method: "POST",
      idempotencyPrefix: "session-revoke",
    });
  },
};
