// 证书固定（Certificate Pinning） — 客户端开关 + 远端 kill switch + 期望指纹白名单。
//
// 设计边界：
// - React Native 内置 `fetch` 默认不支持证书固定；真正的 TLS 校验需要原生模块（Android: OkHttp
//   CertificatePinner / iOS: NSURLSessionDelegate）。本模块**不**实现 native TLS 校验本身，
//   只负责：
//     1. 维护"是否启用 pinning"的本地状态与远端 kill switch；
//     2. 维护期望证书指纹（SHA-256）白名单与生效区间；
//     3. 暴露 `evaluatePinning(host, certSha256?)`，由 native bridge 在握手成功后回调比对，
//        bridge 缺失时返回"不可校验"，由调用方决定是降级（默认）还是阻断。
// - 默认 OFF：在服务端正式切换长生命周期证书 + 灰度策略就绪前不开启，避免误杀正常用户。
// - 远端开关：通过 `/api/v1/mobile/security/pinning` 拉取最新策略；本地缓存 + signature 字段
//   的拓展点已留出，但本期不做强校验（待选定签名机制后扩展）。
// - 调试代理（Charles/Fiddler）触发 native 拦截时，模块返回 "violation"，由原生侧决定阻断；
//   debug build 默认 mode="report"，release build 默认 mode="enforce"。

import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

const STORAGE_KEY = "acp.security.pinning.v1";

export type PinningMode = "off" | "report" | "enforce";

export const pinningPolicySchema = z.object({
  mode: z.enum(["off", "report", "enforce"]),
  /** 期望证书指纹白名单（SHA-256，hex 小写，去 ":"），多条用于轮换。 */
  expectedSha256: z.array(z.string().regex(/^[0-9a-f]{64}$/)).max(8),
  /** 适用主机（精确 host，不含端口与路径）。 */
  hosts: z.array(z.string().min(1).max(253)).max(16),
  /** 策略生效起止时间（ISO）。超出窗口视为 mode="off"。 */
  notBefore: z.string().datetime().optional(),
  notAfter: z.string().datetime().optional(),
  /** 远端策略版本号；本地缓存据此判断更新。 */
  version: z.number().int().nonnegative(),
});
export type PinningPolicy = z.infer<typeof pinningPolicySchema>;

export const DEFAULT_POLICY: PinningPolicy = {
  mode: "off",
  expectedSha256: [],
  hosts: [],
  version: 0,
};

let current: PinningPolicy = DEFAULT_POLICY;
let observer: ((evt: PinningEvent) => void) | null = null;

export type PinningEvent =
  | { kind: "policy_loaded"; policy: PinningPolicy }
  | { kind: "policy_updated"; policy: PinningPolicy }
  | { kind: "evaluation"; host: string; outcome: PinningOutcome; mode: PinningMode };

export type PinningOutcome = "allow" | "violation" | "unverifiable" | "out_of_scope" | "out_of_window";

export function setPinningObserver(next: ((evt: PinningEvent) => void) | null) {
  observer = next;
}

function emit(evt: PinningEvent) {
  try {
    observer?.(evt);
  } catch {
    // observer 不影响业务
  }
}

function inWindow(p: PinningPolicy, now = Date.now()): boolean {
  if (p.notBefore) {
    const ts = Date.parse(p.notBefore);
    if (Number.isFinite(ts) && now < ts) return false;
  }
  if (p.notAfter) {
    const ts = Date.parse(p.notAfter);
    if (Number.isFinite(ts) && now > ts) return false;
  }
  return true;
}

export const pinningStore = {
  /** App 启动时调用：从本地 AsyncStorage 恢复最近一次策略。失败回退到 DEFAULT_POLICY。 */
  async load(): Promise<PinningPolicy> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        current = DEFAULT_POLICY;
      } else {
        const parsed = pinningPolicySchema.safeParse(JSON.parse(raw));
        current = parsed.success ? parsed.data : DEFAULT_POLICY;
      }
    } catch {
      current = DEFAULT_POLICY;
    }
    emit({ kind: "policy_loaded", policy: current });
    return current;
  },
  /** 远端拉取后调用；只接受版本号严格大于当前的策略，避免回放旧策略。 */
  async save(next: PinningPolicy): Promise<PinningPolicy> {
    const validated = pinningPolicySchema.parse(next);
    if (validated.version < current.version) return current;
    current = validated;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
    } catch {
      // 持久化失败不阻断业务
    }
    emit({ kind: "policy_updated", policy: validated });
    return validated;
  },
  /** 测试 / 退出登录时清空。 */
  async clear(): Promise<void> {
    current = DEFAULT_POLICY;
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
  current(): PinningPolicy {
    return current;
  },
};

/**
 * 评估某次握手是否符合 pinning 策略。
 * - 由 native bridge 在 TLS 握手成功后回调；不做 native 校验本身。
 * - 调用方根据返回值决定是否阻断：mode="enforce" + outcome="violation" 必须阻断。
 */
export function evaluatePinning(host: string, certSha256?: string): PinningOutcome {
  const policy = current;
  if (policy.mode === "off") {
    emit({ kind: "evaluation", host, outcome: "out_of_scope", mode: "off" });
    return "out_of_scope";
  }
  if (!inWindow(policy)) {
    emit({ kind: "evaluation", host, outcome: "out_of_window", mode: policy.mode });
    return "out_of_window";
  }
  if (!policy.hosts.includes(host)) {
    emit({ kind: "evaluation", host, outcome: "out_of_scope", mode: policy.mode });
    return "out_of_scope";
  }
  if (!certSha256) {
    emit({ kind: "evaluation", host, outcome: "unverifiable", mode: policy.mode });
    return "unverifiable";
  }
  const normalized = certSha256.toLowerCase().replace(/:/g, "");
  const ok = policy.expectedSha256.includes(normalized);
  const outcome: PinningOutcome = ok ? "allow" : "violation";
  emit({ kind: "evaluation", host, outcome, mode: policy.mode });
  return outcome;
}

/** 调用方据此决定本次连接是否需要被阻断。 */
export function shouldBlock(outcome: PinningOutcome, mode: PinningMode = current.mode): boolean {
  if (mode !== "enforce") return false;
  return outcome === "violation";
}
