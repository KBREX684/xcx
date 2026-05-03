import * as React from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AppBar,
  AppScreen,
  ApprovalsIcon,
  BellIcon,
  BotIcon,
  CertificateIcon,
  EmptyState,
  LoadingState,
  MessageIcon,
  SegmentedControl,
  StatusBadge,
  Typography,
  haptic,
  palette,
  radius,
  spacing,
  toast,
  type IconProps,
} from "@agent-control-plane/mobile-ui";
import {
  mobileInboxFilterSchema,
  type MobileInboxFilter,
  type MobileInboxItem,
} from "@agent-control-plane/domain/src/mobile";
import { inboxService } from "../../services/inboxService";
import { useAuth } from "../../state/AuthContext";
import type { RouteContext } from "../../navigation/routes";

const FILTER_STORAGE_KEY = "acp.mobile.inbox.filter.v1";
const VISIBLE_FILTERS: ReadonlyArray<{ value: MobileInboxFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "unread", label: "未读" },
  { value: "mentions", label: "@我" },
  { value: "approvals", label: "审批" },
  { value: "failures", label: "异常" },
  { value: "archived", label: "已归档" },
];

function inboxLeadingIcon(kind: string): React.ComponentType<IconProps> {
  switch (kind) {
    case "approval":
      return ApprovalsIcon;
    case "run":
    case "failure":
      return BotIcon;
    case "proof_exception":
      return CertificateIcon;
    case "mention":
    case "reply":
      return MessageIcon;
    default:
      return BellIcon;
  }
}

async function loadPersistedFilter(): Promise<MobileInboxFilter> {
  try {
    const raw = await AsyncStorage.getItem(FILTER_STORAGE_KEY);
    const result = mobileInboxFilterSchema.safeParse(raw);
    return result.success ? result.data : "all";
  } catch {
    return "all";
  }
}

async function persistFilter(filter: MobileInboxFilter): Promise<void> {
  try {
    await AsyncStorage.setItem(FILTER_STORAGE_KEY, filter);
  } catch {
    // ignore
  }
}

export function InboxListScreen({ navigate, goBack }: RouteContext) {
  const auth = useAuth();
  const memberId = auth.session?.memberId ?? "anonymous";
  const [filter, setFilter] = React.useState<MobileInboxFilter>("all");
  const [hydrated, setHydrated] = React.useState(false);
  const qc = useQueryClient();

  React.useEffect(() => {
    void (async () => {
      setFilter(await loadPersistedFilter());
      setHydrated(true);
    })();
  }, []);

  const query = useQuery({
    queryKey: ["mobile.inbox", memberId, filter],
    enabled: hydrated,
    queryFn: async () => {
      const result = await inboxService.list(memberId, { filter });
      if ("error" in result) throw new Error(result.error);
      return result;
    },
    staleTime: 15_000,
  });

  const items = query.data?.items ?? [];
  const staleSince = query.data?.staleSince;
  const unreadCount = items.filter((it) => it.unread && !it.archived).length;

  const invalidateInbox = () => qc.invalidateQueries({ queryKey: ["mobile.inbox", memberId] });

  const handleSelectFilter = (next: MobileInboxFilter) => {
    if (next === filter) return;
    setFilter(next);
    void persistFilter(next);
    haptic.weak();
  };

  const handleMarkAllUnreadRead = async () => {
    const unreadIds = items.filter((it) => it.unread && !it.archived).map((it) => it.id);
    if (unreadIds.length === 0) return;
    const res = await inboxService.markRead(unreadIds);
    if (res.ok) {
      toast.success("已标记为已读");
      void invalidateInbox();
    } else {
      toast.error(res.error.message);
    }
  };

  const handleArchive = async (item: MobileInboxItem) => {
    const res = await inboxService.archive([item.id]);
    if (res.ok) {
      haptic.weak();
      toast.success("已归档");
      void invalidateInbox();
    } else {
      toast.error(res.error.message);
    }
  };

  const handleMarkRead = async (item: MobileInboxItem) => {
    if (!item.unread) return;
    const res = await inboxService.markRead([item.id]);
    if (res.ok) {
      toast.success("已标记为已读");
      void invalidateInbox();
    } else {
      toast.error(res.error.message);
    }
  };

  if (!hydrated || query.isLoading) {
    return (
      <AppScreen>
        <AppBar title="收件箱" onBack={goBack} />
        <LoadingState label="加载收件箱" />
      </AppScreen>
    );
  }

  return (
    <AppScreen padded={false}>
      <AppBar
        title="收件箱"
        onBack={goBack}
        right={
          unreadCount > 0 ? (
            <Pressable
              onPress={handleMarkAllUnreadRead}
              accessibilityRole="button"
              accessibilityLabel="全部已读"
              hitSlop={8}
              style={({ pressed }) => [styles.markAll, pressed && styles.pressed]}
            >
              <Typography variant="caption" tone="accent" weight="medium">
                已读
              </Typography>
            </Pressable>
          ) : null
        }
      />

      <View style={styles.tabsHost}>
        <SegmentedControl<MobileInboxFilter>
          value={filter}
          onChange={(next) => handleSelectFilter(next)}
          options={VISIBLE_FILTERS.map((f) => ({
            value: f.value,
            label: f.label,
            badge: f.value === "unread" ? unreadCount : undefined,
          }))}
        />
      </View>

      {staleSince ? (
        <View style={styles.staleBanner}>
          <Typography variant="caption" tone="muted">
            只读缓存 · 最近更新 {new Date(staleSince).toLocaleString()}
          </Typography>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.body}
        ItemSeparatorComponent={ItemSeparator}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching && !query.isLoading}
            onRefresh={() => void query.refetch()}
            tintColor={palette.accent}
          />
        }
        ListEmptyComponent={
          query.isError ? (
            <EmptyState
              tone="danger"
              title="加载失败"
              description={query.error instanceof Error ? query.error.message : "请检查网络"}
              actionLabel="重试"
              onAction={() => void query.refetch()}
            />
          ) : (
            <EmptyState title="暂无消息" description="新的任务回执和审批会出现在这里" />
          )
        }
        renderItem={({ item }) => (
          <InboxRow
            item={item}
            onOpen={() => navigate({ name: "InboxDetail", itemId: item.id })}
            onArchive={() => void handleArchive(item)}
            onMarkRead={() => void handleMarkRead(item)}
          />
        )}
      />
    </AppScreen>
  );
}

function InboxRow({
  item,
  onOpen,
  onArchive,
  onMarkRead,
}: {
  item: MobileInboxItem;
  onOpen: () => void;
  onArchive: () => void;
  onMarkRead: () => void;
}) {
  const Icon = inboxLeadingIcon(item.kind);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={onOpen}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.leading}>
        <Icon size={18} color={item.unread ? palette.accent : palette.textMuted} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.titleRow}>
          <Typography variant="bodyLg" weight="medium" numberOfLines={2} style={styles.title}>
            {item.title}
          </Typography>
          {item.unread ? <StatusBadge label="未读" tone="accent" dot /> : null}
        </View>
        <Typography variant="caption" tone="muted" numberOfLines={2} style={styles.subtitle}>
          {item.subtitle}
        </Typography>
        <Typography variant="caption" tone="muted">
          {new Date(item.createdAt).toLocaleString()}
        </Typography>
      </View>
      <View style={styles.rowActions}>
        {item.unread ? <ActionButton label="已读" onPress={onMarkRead} /> : null}
        {!item.archived ? <ActionButton label="归档" onPress={onArchive} /> : null}
      </View>
    </Pressable>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
    >
      <Typography variant="caption" tone="accent" weight="semibold">
        {label}
      </Typography>
    </Pressable>
  );
}

function ItemSeparator() {
  return <View style={styles.sep} />;
}

const styles = StyleSheet.create({
  tabsHost: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  staleBanner: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  body: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  markAll: {
    minHeight: 36,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  row: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  pressed: { backgroundColor: palette.bgSubtle },
  leading: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.bgSubtle,
  },
  rowBody: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flex: 1, minWidth: 0 },
  subtitle: { marginTop: 2 },
  rowActions: {
    width: 58,
    gap: spacing.xs,
    alignItems: "stretch",
  },
  actionButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: palette.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.border,
    marginHorizontal: spacing.md,
  },
});
