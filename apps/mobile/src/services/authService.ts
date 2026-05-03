// 登录 / 登出 / refresh 业务封装。控制器层只调用这里，不直接 fetch。
import { mobileTokenPairSchema, type MobileTokenPair } from "@agent-control-plane/domain/src/mobile";
import { apiClient } from "./apiClient";
import { clearSession, writeSession } from "../storage/secureTokenStore";

export const authService = {
  async loginWithPassword(input: { account: string; password: string }) {
    const result = await apiClient.request<MobileTokenPair>({
      path: "/auth/login",
      method: "POST",
      body: { email: input.account, password: input.password },
      schema: mobileTokenPairSchema,
      anonymous: true,
      idempotencyPrefix: "login",
    });
    if (result.ok) {
      await writeSession({
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
        memberId: result.data.memberId,
        role: result.data.role,
        name: result.data.name,
      });
    }
    return result;
  },

  async logout() {
    await apiClient.request({ path: "/auth/logout", method: "POST" });
    await clearSession();
  },
};
