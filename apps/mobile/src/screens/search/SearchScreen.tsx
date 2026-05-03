// 全局搜索：搜索 项目 / 任务 / Agent / Run / 证据 / Workflow。
// 防抖输入；空 query 显示历史关键词（本地）。
import * as React from "react";
import { FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AppBar,
  AppScreen,
  Card,
  EmptyState,
  LoadingState,
  StatusBadge,
  Typography,
  palette,
  radius,
  spacing,
  toast,
} from "@agent-control-plane/mobile-ui";
import type { MobileCommandSearchItem } from "@agent-control-plane/domain/src/mobile";
import { searchService } from "../../services/searchService";
import type { Route, RouteContext } from "../../navigation/routes";

const HISTORY_KEY = "acp.mobile.search.history.v1";
const MAX_HISTORY = 10;

export function SearchScreen({ goBack, navigate }: RouteContext) {
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<MobileCommandSearchItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [history, setHistory] = React.useState<string[]>([]);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) setHistory(parsed.filter((x) => typeof x === "string").slice(0, MAX_HISTORY));
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const runSearch = React.useCallback(async (term: string) => {
    if (!term.trim()) {
      setItems([]);
      return;
    }
    setLoading(true);
    const res = await searchService.search(term);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error.message);
      setItems([]);
      return;
    }
    setItems(res.data.items);
    void persistHistory(term);
  }, []);

  const persistHistory = React.useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setHistory((prev) => {
      const next = [trimmed, ...prev.filter((x) => x !== trimmed)].slice(0, MAX_HISTORY);
      void AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleChange = (next: string) => {
    setQ(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void runSearch(next), 280);
  };

  const handlePickItem = (item: MobileCommandSearchItem) => {
    const route = mapToRoute(item);
    if (route) {
      navigate(route);
    } else {
      toast.warn("请到 Web 端打开此对象");
    }
  };

  return (
    <AppScreen padded={false}>
      <AppBar title="全局搜索" onBack={goBack} />
      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="搜索框"
          autoCorrect={false}
          autoCapitalize="none"
          autoFocus
          placeholder="搜索项目 / 任务 / Agent / 证据"
          placeholderTextColor={palette.textMuted}
          style={styles.input}
          value={q}
          onChangeText={handleChange}
          returnKeyType="search"
          onSubmitEditing={() => void runSearch(q)}
        />
      </View>

      {loading ? (
        <LoadingState label="搜索中…" />
      ) : q.trim().length === 0 ? (
        <View style={styles.body}>
          <Typography variant="caption" tone="muted">
            最近搜索
          </Typography>
          <View style={styles.historyRow}>
            {history.length === 0 ? (
              <Typography variant="caption" tone="muted">
                暂无历史
              </Typography>
            ) : (
              history.map((h) => (
                <Pressable
                  key={h}
                  onPress={() => {
                    setQ(h);
                    void runSearch(h);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`搜索 ${h}`}
                  style={styles.chip}
                >
                  <Typography variant="caption" tone="secondary">
                    {h}
                  </Typography>
                </Pressable>
              ))
            )}
          </View>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, idx) => `${item.id}-${idx}`}
          contentContainerStyle={styles.body}
          ListEmptyComponent={<EmptyState title="未找到结果" description="换个关键词试试" />}
          renderItem={({ item }) => (
            <Pressable onPress={() => handlePickItem(item)} accessibilityRole="button">
              <Card style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <Typography variant="body" weight="semibold" numberOfLines={1}>
                    {item.title}
                  </Typography>
                  <StatusBadge label={item.type} tone="neutral" />
                </View>
                <Typography variant="caption" tone="muted" numberOfLines={2}>
                  {item.subtitle}
                </Typography>
              </Card>
            </Pressable>
          )}
        />
      )}
    </AppScreen>
  );
}

function mapToRoute(item: MobileCommandSearchItem): Route | null {
  if (item.action !== "navigate") return null;
  switch (item.type) {
    case "project": {
      const id = matchSegment(item.href, /\/projects\/([^/?#]+)/);
      return id ? { name: "ProjectOverview", projectId: id } : null;
    }
    case "issue": {
      const id = matchSegment(item.href, /\/tasks\/([^/?#]+)/);
      return id ? { name: "TaskDetail", taskId: id } : null;
    }
    case "agent": {
      const id = matchSegment(item.href, /\/agents\/([^/?#]+)/);
      return id ? { name: "AgentDetail", agentId: id } : null;
    }
    case "workflow": {
      const id = matchSegment(item.href, /\/workflows\/([^/?#]+)/);
      return id ? { name: "WorkflowForm", templateId: id } : { name: "WorkflowList" };
    }
    case "evidence": {
      const id = matchSegment(item.href, /\/runs\/([^/?#]+)/);
      return id ? { name: "RunDetail", runId: id } : null;
    }
    default:
      return null;
  }
}

function matchSegment(href: string, re: RegExp): string | null {
  const m = href.match(re);
  return m && m[1] ? decodeURIComponent(m[1]) : null;
}

const styles = StyleSheet.create({
  searchRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  input: {
    backgroundColor: palette.bgSurface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: palette.textPrimary,
    fontSize: 16,
  },
  body: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  historyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.bgSubtle,
  },
  resultCard: { padding: spacing.md },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
});
