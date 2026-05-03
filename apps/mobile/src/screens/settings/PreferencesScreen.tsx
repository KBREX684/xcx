// 偏好设置（P3-2-01）：通知类别 / 默认首页 / 刷新间隔。
// 所有变更落本地 + telemetry 审计，不写服务端。
import * as React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import {
  AppBar,
  AppScreen,
  Card,
  LoadingState,
  Typography,
  haptic,
  palette,
  radius,
  spacing,
  toast,
} from "@agent-control-plane/mobile-ui";
import {
  DEFAULT_PREFERENCES,
  preferencesStore,
  type DefaultHome,
  type MobilePreferences,
} from "../../state/preferencesStore";
import type { RouteContext } from "../../navigation/routes";

export function PreferencesScreen({ goBack }: RouteContext) {
  const [prefs, setPrefs] = React.useState<MobilePreferences | null>(null);

  React.useEffect(() => {
    void (async () => {
      const loaded = await preferencesStore.load();
      setPrefs(loaded);
    })();
  }, []);

  const update = React.useCallback(async (next: MobilePreferences, key: string) => {
    setPrefs(next);
    await preferencesStore.save(next, key);
    haptic.weak();
    toast.success("已保存");
  }, []);

  if (!prefs) {
    return (
      <AppScreen padded={false}>
        <AppBar title="偏好设置" onBack={goBack} />
        <LoadingState />
      </AppScreen>
    );
  }

  return (
    <AppScreen padded={false}>
      <AppBar title="偏好设置" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          <Typography variant="title" weight="semibold">
            通知类别
          </Typography>
          <Typography variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
            仅控制本机的通知展示。系统通知权限请在系统设置中调整。
          </Typography>
          <View style={{ height: spacing.sm }} />
          <ToggleRow
            label="审批待处理"
            value={prefs.notify.approval}
            onChange={(v) => update({ ...prefs, notify: { ...prefs.notify, approval: v } }, "notify.approval")}
          />
          <ToggleRow
            label="Run 异常"
            value={prefs.notify.runFailed}
            onChange={(v) => update({ ...prefs, notify: { ...prefs.notify, runFailed: v } }, "notify.runFailed")}
          />
          <ToggleRow
            label="证据告警"
            value={prefs.notify.evidence}
            onChange={(v) => update({ ...prefs, notify: { ...prefs.notify, evidence: v } }, "notify.evidence")}
          />
          <ToggleRow
            label="@提及"
            value={prefs.notify.mentions}
            onChange={(v) => update({ ...prefs, notify: { ...prefs.notify, mentions: v } }, "notify.mentions")}
          />
        </Card>

        <Card style={styles.card}>
          <Typography variant="title" weight="semibold">
            默认首页
          </Typography>
          <Typography variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
            登录后默认进入的页面。
          </Typography>
          <View style={{ height: spacing.sm }} />
          <ChoiceRow<DefaultHome>
            current={prefs.defaultHome}
            options={[
              { value: "home", label: "首页摘要" },
              { value: "inbox", label: "收件箱" },
              { value: "projects", label: "项目列表" },
            ]}
            onChange={(v) => update({ ...prefs, defaultHome: v }, "defaultHome")}
          />
        </Card>

        <Card style={styles.card}>
          <Typography variant="title" weight="semibold">
            列表刷新
          </Typography>
          <Typography variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
            前台页面自动刷新节流（弱网下建议关闭）。
          </Typography>
          <View style={{ height: spacing.sm }} />
          <ChoiceRow<MobilePreferences["refreshIntervalSec"]>
            current={prefs.refreshIntervalSec}
            options={[
              { value: 0, label: "关闭" },
              { value: 30, label: "30 秒" },
              { value: 60, label: "1 分钟" },
              { value: 120, label: "2 分钟" },
            ]}
            onChange={(v) => update({ ...prefs, refreshIntervalSec: v }, "refreshIntervalSec")}
          />
        </Card>

        <Card style={styles.card}>
          <Typography variant="caption" tone="muted">
            治理边界：移动端仅开放本机展示偏好，Agent 启停 / 审批策略 / 团队权限等高风险设置请在 Web 端处理。
          </Typography>
          <Typography
            variant="caption"
            tone="muted"
            style={{ marginTop: spacing.xs }}
            onPress={async () => {
              await preferencesStore.save(DEFAULT_PREFERENCES, "reset");
              setPrefs(DEFAULT_PREFERENCES);
              haptic.weak();
              toast.success("已恢复默认");
            }}
          >
            恢复默认设置
          </Typography>
        </Card>
      </ScrollView>
    </AppScreen>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Pressable
      style={styles.row}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
    >
      <Typography variant="body">{label}</Typography>
      <View style={[styles.toggle, value ? styles.toggleOn : styles.toggleOff]}>
        <View style={[styles.thumb, value ? styles.thumbOn : styles.thumbOff]} />
      </View>
    </Pressable>
  );
}

function ChoiceRow<T extends string | number>({
  current,
  options,
  onChange,
}: {
  current: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.choiceRow}>
      {options.map((opt) => {
        const active = opt.value === current;
        return (
          <Pressable
            key={String(opt.value)}
            style={[styles.chip, active ? styles.chipActive : null]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
          >
            <Typography
              variant="caption"
              weight={active ? "semibold" : "regular"}
              style={{ color: active ? palette.textInverse : palette.textPrimary }}
            >
              {opt.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { marginTop: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: radius.pill,
    padding: 3,
    justifyContent: "center",
  },
  toggleOn: { backgroundColor: palette.accent },
  toggleOff: { backgroundColor: palette.bgSubtle },
  thumb: { width: 20, height: 20, borderRadius: radius.pill, backgroundColor: "#ffffff" },
  thumbOn: { alignSelf: "flex-end" },
  thumbOff: { alignSelf: "flex-start" },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: palette.bgSubtle,
  },
  chipActive: { backgroundColor: palette.accent },
});
