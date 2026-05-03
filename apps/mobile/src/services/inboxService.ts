// 收件箱服务：直接复用平台级 /api/v1/inbox 端点。
// - 列表带 filter/lastSeenAt 服务端筛选；mobile-side 仍可做二次过滤
// - 已读/归档为幂等 POST，重试不会改变最终状态
// - 缓存：仅缓存"all"筛选下的最近一页，离线回放显示"只读缓存"

import { z } from "zod";
import {
  mobileInboxFilterSchema,
  mobileInboxItemSchema,
  type MobileInboxFilter,
  type MobileInboxItem,
} from "@agent-control-plane/domain/src/mobile";
import { apiClient } from "./apiClient";
import { staleCache, type CachedRead } from "../cache/staleCache";

const inboxListSchema = z.array(mobileInboxItemSchema);

interface InboxListParams {
  filter?: MobileInboxFilter;
  lastSeenAt?: string;
  /** 当 true 时优先返回缓存（用于"先缓存后网络"的双轨刷新）。 */
  preferCache?: boolean;
}

export interface InboxListResult {
  items: MobileInboxItem[];
  /** 来自缓存时填充。 */
  staleSince?: string;
}

function cacheKeyFor(memberId: string, filter: MobileInboxFilter): string {
  return `inbox.${memberId}.${filter}`;
}

export const inboxService = {
  async list(memberId: string, params: InboxListParams = {}): Promise<InboxListResult | { error: string }> {
    const filter = params.filter ?? "all";
    mobileInboxFilterSchema.parse(filter);

    const query: Record<string, string | number | boolean> = {};
    if (params.lastSeenAt) query.lastSeenAt = params.lastSeenAt;
    // 后端 inbox 接口接受 unread/archived/kind 而非 filter；做一次客户端到服务端的映射
    switch (filter) {
      case "unread":
        query.unread = "true";
        break;
      case "archived":
        query.archived = "true";
        break;
      case "approvals":
        query.kind = "approval";
        break;
      case "failures":
        query.kind = "failure";
        break;
      case "mentions":
        query.kind = "mention";
        break;
      case "proof":
        query.kind = "proof_exception";
        break;
      default:
        break;
    }

    const cacheKey = cacheKeyFor(memberId, filter);
    if (params.preferCache) {
      const cached = (await staleCache.read<MobileInboxItem[]>(cacheKey)) as
        | CachedRead<MobileInboxItem[]>
        | null;
      if (cached) return { items: cached.data, staleSince: cached.lastUpdatedAt };
    }

    const res = await apiClient.request<MobileInboxItem[]>({
      path: "/api/v1/inbox",
      query,
      schema: inboxListSchema,
    });
    if (!res.ok) {
      const cached = (await staleCache.read<MobileInboxItem[]>(cacheKey)) as
        | CachedRead<MobileInboxItem[]>
        | null;
      if (cached) return { items: cached.data, staleSince: cached.lastUpdatedAt };
      return { error: res.error.message };
    }
    await staleCache.write(cacheKey, res.data);
    return { items: res.data };
  },

  async markRead(itemIds: string[]) {
    return apiClient.request({
      path: "/api/v1/inbox/read",
      method: "POST",
      body: { itemIds },
      idempotencyPrefix: "inbox-read",
    });
  },

  async archive(itemIds: string[]) {
    return apiClient.request({
      path: "/api/v1/inbox/archive",
      method: "POST",
      body: { itemIds },
      idempotencyPrefix: "inbox-archive",
    });
  },
};
