// Toast 与轻触感反馈：P1-5 体验增强。
// 设计要点：
// - Toast 是单例 host，挂在应用根（App.tsx 中 ToastHost）；通过 setToast 更新单一可见消息。
// - 高风险路径（审批通过/驳回）建议结合 Toast + haptic.weak()，但不要主动播放音效。
// - AUDIT-04：当 ToastHost 尚未挂载或 dev 热重载短暂为 null 时，最近一条消息进入挂起队列；
//   挂载后 flush，保证不会"调用了 toast.success 但用户什么都没看见"。

import * as React from "react";
import { Animated, Easing, Platform, StyleSheet, Vibration, View } from "react-native";
import { palette, radius, spacing, fontSize, fontWeight } from "../tokens";

export type ToastTone = "default" | "success" | "danger" | "warning";

export interface ToastMessage {
  id: number;
  text: string;
  tone: ToastTone;
}

let setter: ((msg: ToastMessage | null) => void) | null = null;
let counter = 1;
// 仅缓存最近一条；多条同时到来时按"最后写入胜出"，与挂载后的替换语义一致。
let pending: ToastMessage | null = null;

export const toast = {
  show(text: string, tone: ToastTone = "default") {
    const msg: ToastMessage = { id: counter++, text, tone };
    if (setter) {
      setter(msg);
      return;
    }
    pending = msg;
  },
  success(text: string) {
    this.show(text, "success");
  },
  error(text: string) {
    this.show(text, "danger");
  },
  warn(text: string) {
    this.show(text, "warning");
  },
  /** 仅供测试使用：清空挂起消息与计数。 */
  __resetForTest() {
    pending = null;
    counter = 1;
    setter = null;
  },
};

export const haptic = {
  /** 短促轻反馈（10ms 振动）。审批/扫码成功用。 */
  weak() {
    if (Platform.OS === "android") return;
    try {
      Vibration.vibrate(10);
    } catch {
      // platform may not support
    }
  },
  /** 警示反馈（短-停-短）。仅用于提交失败需要用户注意。 */
  warn() {
    if (Platform.OS === "android") return;
    try {
      Vibration.vibrate([0, 12, 60, 12]);
    } catch {
      // ignore
    }
  },
};

export function ToastHost() {
  const [msg, setMsg] = React.useState<ToastMessage | null>(null);
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    setter = setMsg;
    // 挂载后 flush 挂起消息（解决 dev 热重载或启动期短暂为 null 的丢消息问题）
    if (pending) {
      const next = pending;
      pending = null;
      setMsg(next);
    }
    return () => {
      setter = null;
    };
  }, []);

  React.useEffect(() => {
    if (!msg) return;
    Animated.timing(opacity, {
      toValue: 1,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMsg(null);
      });
    }, 2400);
    return () => clearTimeout(t);
  }, [msg, opacity]);

  if (!msg) return null;
  const bg =
    msg.tone === "success"
      ? palette.success
      : msg.tone === "danger"
        ? palette.danger
        : msg.tone === "warning"
          ? palette.warning
          : palette.textPrimary;

  return (
    <View pointerEvents="none" style={styles.host}>
      <Animated.View style={[styles.bubble, { backgroundColor: bg, opacity }]}>
        <Animated.Text style={styles.text}>{msg.text}</Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 80,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  bubble: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    maxWidth: "92%",
  },
  text: {
    color: palette.bgSurface,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
});
