// 弱网只读缓存：把网络请求的"上一次成功响应"落 AsyncStorage，离线/失败时回放。
// 注意：本缓存仅服务于"读"接口；写接口（审批通过/驳回、撤回同意等）严禁回放。
//
// 策略：
// - 命中时返回 { data, lastUpdatedAt, stale: true }，UI 必须显式提示"只读缓存"。
// - 不实现复杂 TTL：默认 24h 内可作为离线回放；超过则视为不可用。
// - key 命名 "acp.cache.v1.<scope>"；scope 由调用方决定，必须包含 memberId 隔离。
// - L-CODE-08：read() 通过 onObservation 回调暴露 hit/miss/expired，由上层接 telemetry。

import AsyncStorage from "@react-native-async-storage/async-storage";

const NS = "acp.cache.v1.";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface Envelope<T> {
  data: T;
  savedAt: string;
  schemaVersion: number;
}

export interface CachedRead<T> {
  data: T;
  lastUpdatedAt: string;
  stale: true;
}

export type StaleCacheObservation =
  | { scope: string; outcome: "hit"; ageMs: number }
  | { scope: string; outcome: "miss" }
  | { scope: string; outcome: "expired"; ageMs: number }
  | { scope: string; outcome: "corrupt" };

let observer: ((obs: StaleCacheObservation) => void) | null = null;

export function setStaleCacheObserver(next: ((obs: StaleCacheObservation) => void) | null) {
  observer = next;
}

function emit(obs: StaleCacheObservation) {
  try {
    observer?.(obs);
  } catch {
    // observer 不能影响业务
  }
}

export const staleCache = {
  async write<T>(scope: string, data: T): Promise<void> {
    const env: Envelope<T> = { data, savedAt: new Date().toISOString(), schemaVersion: 1 };
    try {
      await AsyncStorage.setItem(NS + scope, JSON.stringify(env));
    } catch {
      // 容错：缓存不可用不应阻断业务
    }
  },
  async read<T>(scope: string): Promise<CachedRead<T> | null> {
    try {
      const raw = await AsyncStorage.getItem(NS + scope);
      if (!raw) {
        emit({ scope, outcome: "miss" });
        return null;
      }
      const parsed = JSON.parse(raw) as Envelope<T>;
      if (parsed.schemaVersion !== 1) {
        emit({ scope, outcome: "corrupt" });
        return null;
      }
      const ts = Date.parse(parsed.savedAt);
      if (!Number.isFinite(ts)) {
        emit({ scope, outcome: "corrupt" });
        return null;
      }
      const ageMs = Date.now() - ts;
      if (ageMs > MAX_AGE_MS) {
        emit({ scope, outcome: "expired", ageMs });
        return null;
      }
      emit({ scope, outcome: "hit", ageMs });
      return { data: parsed.data, lastUpdatedAt: parsed.savedAt, stale: true };
    } catch {
      emit({ scope, outcome: "corrupt" });
      return null;
    }
  },
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const ours = keys.filter((k) => k.startsWith(NS));
      await Promise.all(ours.map((key) => AsyncStorage.removeItem(key)));
    } catch {
      // ignore
    }
  },
};
