// 全局轻量搜索：复用 /api/v1/command/search?q=。
// 移动端不展示 keywords，只走 title/subtitle/href + type 标签。

import { z } from "zod";
import { type MobileCommandSearchResult } from "@agent-control-plane/domain/src/mobile";
import { apiClient } from "./apiClient";

const itemSchema = z.object({
  id: z.string(),
  type: z.enum(["issue", "project", "agent", "team", "workflow", "view", "evidence", "action"]),
  title: z.string(),
  subtitle: z.string(),
  href: z.string(),
  action: z.enum(["navigate", "create_issue", "open_evidence"]),
  keywords: z.array(z.string()),
});

const resultSchema = z.object({
  query: z.string(),
  items: z.array(itemSchema),
});

export const searchService = {
  search(q: string) {
    return apiClient.request<MobileCommandSearchResult>({
      path: "/api/v1/command/search",
      query: { q },
      schema: resultSchema,
    });
  },
};
