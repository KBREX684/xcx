import * as React from "react";
import { BackHandler, Pressable, StyleSheet, View } from "react-native";
import {
  HomeIcon,
  ProjectIcon,
  SettingsIcon,
  UserIcon,
  palette,
  spacing,
  Typography,
  type IconProps,
} from "@agent-control-plane/mobile-ui";
import type { Route, RouteContext, TabRouteName } from "./routes";

import { HomeScreen } from "../screens/home/HomeScreen";
import { ApprovalListScreen } from "../screens/approval/ApprovalListScreen";
import { ApprovalDetailScreen } from "../screens/approval/ApprovalDetailScreen";
import { TeamDetailScreen, TeamFormScreen, TeamListScreen } from "../screens/team/TeamScreens";
import {
  ProjectFormScreen,
  ProjectListScreen,
  ProjectOverviewScreen,
  RunDetailScreen,
  TaskDetailScreen,
  WorkflowPickerScreen,
} from "../screens/project/ProjectScreens";
import { WorkflowFormScreen, WorkflowListScreen } from "../screens/workflow/WorkflowScreens";
import { AgentFormScreen, AgentListScreen, AgentDetailScreen } from "../screens/agent/AgentScreens";
import {
  CertificateVerifyScreen,
  CertificateScanScreen,
  CertificateDetailScreen,
} from "../screens/certificate/CertificateScreens";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { AccountSecurityScreen } from "../screens/settings/AccountSecurityScreen";
import { PreferencesScreen } from "../screens/settings/PreferencesScreen";
import { ProductGuideScreen } from "../screens/settings/ProductGuideScreen";
import { OnboardingGuideScreen } from "../screens/settings/OnboardingGuideScreen";
import { InboxListScreen } from "../screens/inbox/InboxListScreen";
import { InboxDetailScreen } from "../screens/inbox/InboxDetailScreen";
import { SearchScreen } from "../screens/search/SearchScreen";
import { LegalScreen } from "../screens/auth/LegalScreen";

const TABS = [
  { key: "Home", label: "首页", icon: HomeIcon, route: { name: "Home" } as Route },
  { key: "TeamList", label: "团队", icon: UserIcon, route: { name: "TeamList" } as Route },
  { key: "ProjectList", label: "项目", icon: ProjectIcon, route: { name: "ProjectList" } as Route },
  { key: "Settings", label: "我的", icon: SettingsIcon, route: { name: "Settings" } as Route },
] as const satisfies ReadonlyArray<{
  key: TabRouteName;
  label: string;
  icon: (p: IconProps) => React.JSX.Element;
  route: Route;
}>;

type TabKey = (typeof TABS)[number]["key"];

export function MainNavigator() {
  const [tab, setTab] = React.useState<TabKey>("Home");
  const [stacks, setStacks] = React.useState<Record<TabKey, Route[]>>(() => ({
    Home: [{ name: "Home" }],
    TeamList: [{ name: "TeamList" }],
    ProjectList: [{ name: "ProjectList" }],
    Settings: [{ name: "Settings" }],
  }));

  const goBack = React.useCallback(() => {
    setStacks((prev) => {
      const cur = prev[tab];
      if (cur.length <= 1) return prev;
      return { ...prev, [tab]: cur.slice(0, -1) };
    });
  }, [tab]);

  React.useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      const cur = stacks[tab];
      if (cur.length > 1) {
        goBack();
        return true;
      }
      if (tab !== "Home") {
        setTab("Home");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [goBack, stacks, tab]);

  const baseCtx: RouteContext = React.useMemo(
    () => ({
      navigate(route) {
        setStacks((prev) => {
          const cur = prev[tab];
          if (cur.length > 0 && cur[cur.length - 1]?.name === route.name) {
            return { ...prev, [tab]: [...cur.slice(0, -1), route] };
          }
          return { ...prev, [tab]: [...cur, route] };
        });
      },
      replace(route) {
        setStacks((prev) => {
          const cur = prev[tab];
          const base = cur.length > 0 ? cur.slice(0, -1) : [];
          const previous = base[base.length - 1];
          if (previous?.name === route.name) {
            return { ...prev, [tab]: [...base.slice(0, -1), route] };
          }
          return { ...prev, [tab]: [...base, route] };
        });
      },
      goBack,
      canGoBack: false,
      resetToTab(target) {
        setTab(target);
        setStacks((prev) => ({ ...prev, [target]: [getInitialRoute(target)] }));
      },
    }),
    [goBack, tab],
  );

  const stack = stacks[tab];
  const top = stack[stack.length - 1] ?? getInitialRoute(tab);
  const showTabBar = stack.length === 1;
  const ctx = React.useMemo<RouteContext>(
    () => ({ ...baseCtx, canGoBack: stack.length > 1 }),
    [baseCtx, stack.length],
  );

  return (
    <View style={styles.root}>
      <View style={styles.screen}>{renderScreen(top, ctx)}</View>
      {showTabBar ? (
        <View style={styles.tabBar}>
          {TABS.map((t) => {
            const active = tab === t.key;
            const Icon = t.icon;
            return (
              <Pressable
                key={t.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t.label}
                onPress={() => {
                  if (active) {
                    setStacks((prev) => ({ ...prev, [t.key]: [getInitialRoute(t.key)] }));
                  } else {
                    setTab(t.key);
                  }
                }}
                style={({ pressed }) => [
                  styles.tabBtn,
                  pressed && { backgroundColor: palette.bgSubtle },
                ]}
              >
                <Icon size={22} color={active ? palette.accent : palette.textSecondary} />
                <Typography
                  variant="caption"
                  weight={active ? "semibold" : "medium"}
                  tone={active ? "accent" : "secondary"}
                >
                  {t.label}
                </Typography>
                <View style={[styles.tabDot, active && styles.tabDotActive]} />
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function getInitialRoute(tab: TabKey): Route {
  switch (tab) {
    case "Home":
      return { name: "Home" };
    case "TeamList":
      return { name: "TeamList" };
    case "ProjectList":
      return { name: "ProjectList" };
    case "Settings":
      return { name: "Settings" };
  }
}

function renderScreen(route: Route, ctx: RouteContext): React.ReactNode {
  switch (route.name) {
    case "Home":
      return <HomeScreen {...ctx} />;
    case "ApprovalList":
      return <ApprovalListScreen {...ctx} />;
    case "ApprovalDetail":
      return <ApprovalDetailScreen runId={route.runId} ctx={ctx} />;
    case "TeamList":
      return <TeamListScreen {...ctx} />;
    case "TeamDetail":
      return <TeamDetailScreen teamId={route.teamId} ctx={ctx} />;
    case "TeamForm":
      return <TeamFormScreen teamId={route.teamId} ctx={ctx} />;
    case "ProjectList":
      return <ProjectListScreen {...ctx} />;
    case "ProjectForm":
      return <ProjectFormScreen projectId={route.projectId} ctx={ctx} />;
    case "ProjectOverview":
      return (
        <ProjectOverviewScreen
          projectId={route.projectId}
          initialTemplateId={route.templateId}
          ctx={ctx}
        />
      );
    case "WorkflowPicker":
      return (
        <WorkflowPickerScreen
          projectId={route.projectId}
          selectedTemplateId={route.selectedTemplateId}
          ctx={ctx}
        />
      );
    case "TaskDetail":
      return <TaskDetailScreen taskId={route.taskId} ctx={ctx} />;
    case "RunDetail":
      return <RunDetailScreen runId={route.runId} ctx={ctx} />;
    case "WorkflowList":
      return <WorkflowListScreen {...ctx} />;
    case "WorkflowForm":
      return <WorkflowFormScreen templateId={route.templateId} ctx={ctx} />;
    case "AgentList":
      return <AgentListScreen {...ctx} />;
    case "AgentDetail":
      return <AgentDetailScreen agentId={route.agentId} ctx={ctx} />;
    case "AgentForm":
      return <AgentFormScreen agentId={route.agentId} ctx={ctx} />;
    case "CertificateVerify":
      return <CertificateVerifyScreen {...ctx} />;
    case "CertificateScan":
      return <CertificateScanScreen {...ctx} />;
    case "CertificateDetail":
      return <CertificateDetailScreen verificationCode={route.verificationCode} ctx={ctx} />;
    case "Settings":
      return <SettingsScreen {...ctx} />;
    case "AccountSecurity":
      return <AccountSecurityScreen {...ctx} />;
    case "Preferences":
      return <PreferencesScreen {...ctx} />;
    case "ProductGuide":
      return <ProductGuideScreen {...ctx} />;
    case "OnboardingGuide":
      return <OnboardingGuideScreen {...ctx} />;
    case "Inbox":
      return <InboxListScreen {...ctx} />;
    case "InboxDetail":
      return <InboxDetailScreen itemId={route.itemId} ctx={ctx} />;
    case "Search":
      return <SearchScreen {...ctx} />;
    case "Legal":
      return <LegalScreen page={route.page} onBack={ctx.goBack} />;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bgPrimary },
  screen: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    height: 68,
    paddingTop: 6,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    backgroundColor: palette.bgSurface,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
    gap: 2,
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  tabDotActive: {
    backgroundColor: palette.accent,
  },
});
