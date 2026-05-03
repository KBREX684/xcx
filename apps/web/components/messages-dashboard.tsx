"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { InboxItem } from "@agent-control-plane/domain";
import { archiveInboxAction, markInboxReadAction } from "../app/actions";
import { formatRelativeTime } from "../lib/format";
import { getInboxKindLabel } from "../lib/inbox-format";
import { StatusPill } from "./status-pill";

type PrimaryFilter = "all" | "unread" | "archived" | "mention";
type KindFilter =
  | "awaiting_input"
  | "failure"
  | "approval"
  | "proof_exception"
  | "assignment"
  | "reply"
  | "run";
type InboxFilter = PrimaryFilter | KindFilter;

const PAGE_SIZE = 10;
const EXCEPTION_STATUSES = new Set(["failed", "error", "rejected", "revoked", "cancelled"]);

const KIND_FILTERS: { key: KindFilter; label: string }[] = [
  { key: "awaiting_input", label: "待输入" },
  { key: "approval", label: "审批" },
  { key: "failure", label: "失败" },
  { key: "proof_exception", label: "证明异常" },
  { key: "assignment", label: "派遣" },
  { key: "reply", label: "回复" },
  { key: "run", label: "执行" },
];

function isExceptionItem(item: InboxItem) {
  return item.status ? EXCEPTION_STATUSES.has(item.status) : false;
}

function buildFormData(itemIds: string[]) {
  const formData = new FormData();
  itemIds.forEach((itemId) => formData.append("itemIds", itemId));
  formData.set("returnPath", "/messages");
  return formData;
}

function getEyebrowTone(item: InboxItem): "exception" | "mention" | "default" {
  if (isExceptionItem(item)) return "exception";
  if (item.kind === "mention") return "mention";
  return "default";
}

function InboxList({
  items,
  onRead,
  onArchive,
  pendingItemId,
  showArchiveAction = true,
}: {
  items: InboxItem[];
  onRead: (itemId: string) => void;
  onArchive: (itemId: string) => void;
  pendingItemId: string | null;
  showArchiveAction?: boolean;
}) {
  if (items.length === 0) {
    return <div className="empty-state">当前筛选下没有匹配的关注事项。</div>;
  }

  return (
    <div className="inbox-list" role="list" aria-label="关注事项列表">
      {items.map((item) => {
        const exception = isExceptionItem(item);
        const busy = pendingItemId === item.id;
        const tone = getEyebrowTone(item);
        return (
          <div
            key={item.id}
            className="inbox-row"
            role="listitem"
            data-unread={item.unread ? "true" : "false"}
            data-exception={exception ? "true" : undefined}
          >
            <Link className="inbox-row__main" href={`/messages/${encodeURIComponent(item.id)}`}>
              <span className="inbox-row__eyebrow" data-tone={tone}>
                {exception ? "需关注" : getInboxKindLabel(item.kind)}
                {item.kind === "mention" ? " · @我" : null}
              </span>
              <span className="inbox-row__title">
                {item.unread ? <span className="inbox-unread-dot" aria-label="未读" /> : null}
                {item.title}
              </span>
              <span className="inbox-row__subtitle">{item.subtitle}</span>
            </Link>
            <span className="inbox-row__meta">
              {item.status ? (
                <span className="inbox-row__status">
                  <StatusPill status={item.status} />
                </span>
              ) : null}
              <span className="inbox-row__time" suppressHydrationWarning>
                {formatRelativeTime(item.createdAt)}
              </span>
            </span>
            <span className="inbox-row__actions">
              {item.unread ? (
                <button
                  type="button"
                  className="ghost-button ghost-button--compact"
                  disabled={busy}
                  onClick={() => onRead(item.id)}
                >
                  标已读
                </button>
              ) : null}
              {showArchiveAction ? (
                <button
                  type="button"
                  className="ghost-button ghost-button--compact"
                  disabled={busy}
                  onClick={() => onArchive(item.id)}
                >
                  归档
                </button>
              ) : (
                <span className="inbox-row__archived-label">已归档</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function MessagesDashboard({
  items,
  archivedItems,
  lastSeenAt,
}: {
  items: InboxItem[];
  archivedItems: InboxItem[];
  lastSeenAt?: string | null;
}) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<InboxFilter>("all");
  const [page, setPage] = useState(1);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const counts = useMemo(() => {
    const base: Record<InboxFilter, number> = {
      all: items.length,
      unread: 0,
      archived: archivedItems.length,
      mention: 0,
      awaiting_input: 0,
      failure: 0,
      approval: 0,
      proof_exception: 0,
      assignment: 0,
      reply: 0,
      run: 0,
    };
    for (const item of items) {
      if (item.unread) base.unread += 1;
      if (item.kind in base) {
        base[item.kind as KindFilter] += 1;
      }
    }
    return base;
  }, [archivedItems.length, items]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    if (activeFilter === "unread") return items.filter((item) => item.unread);
    if (activeFilter === "archived") return archivedItems;
    return items.filter((item) => item.kind === activeFilter);
  }, [activeFilter, archivedItems, items]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function selectFilter(nextFilter: InboxFilter) {
    setActiveFilter(nextFilter);
    setPage(1);
  }

  function markItemsRead(itemIds: string[]) {
    if (itemIds.length === 0) return;
    setPendingItemId(itemIds.length === 1 ? (itemIds[0] ?? null) : "bulk");
    startTransition(async () => {
      await markInboxReadAction(buildFormData(itemIds));
      router.refresh();
      setPendingItemId(null);
    });
  }

  function archiveItem(itemId: string) {
    setPendingItemId(itemId);
    startTransition(async () => {
      await archiveInboxAction(buildFormData([itemId]));
      router.refresh();
      setPendingItemId(null);
    });
  }

  const unreadIds = useMemo(
    () => items.filter((item) => item.unread).map((item) => item.id),
    [items],
  );

  const primaryTiles: Array<{
    key: PrimaryFilter;
    label: string;
    count: number;
    tone?: "accent" | "warn" | "danger";
  }> = [
    { key: "all", label: "全部", count: counts.all },
    { key: "unread", label: "未读", count: counts.unread, tone: "accent" },
    { key: "archived", label: "已归档", count: counts.archived },
    { key: "mention", label: "@我", count: counts.mention, tone: "accent" },
  ];

  const headingTitle =
    activeFilter === "all"
      ? "全部关注事项"
      : activeFilter === "unread"
        ? "未读"
        : activeFilter === "archived"
          ? "已归档"
          : activeFilter === "mention"
            ? "@我"
            : getInboxKindLabel(activeFilter);

  return (
    <div className="inbox-shell">
      <div className="inbox-shell-bar">
        <div className="inbox-shell-head">
          <p className="acp-list-head__kicker">收件箱</p>
          <h2 className="inbox-shell-title">关注事项</h2>
          <p className="inbox-shell-subtitle">
            集中处理任务回执、审批与异常。
            {lastSeenAt ? (
              <>
                {" "}
                <span suppressHydrationWarning>
                  上次查看 {formatRelativeTime(lastSeenAt)}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="inbox-shell-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => markItemsRead(unreadIds)}
            disabled={isPending || counts.unread === 0}
          >
            {isPending && pendingItemId === "bulk"
              ? "提交中…"
              : `全部标已读 (${counts.unread})`}
          </button>
        </div>
      </div>

      <div className="metric-strip" role="tablist" aria-label="关注事项主筛">
        {primaryTiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            role="tab"
            aria-selected={activeFilter === tile.key}
            className="metric-strip__item"
            data-interactive="true"
            data-active={activeFilter === tile.key ? "true" : undefined}
            onClick={() => selectFilter(tile.key)}
          >
            <span className="metric-strip__label">{tile.label}</span>
            <span
              className={`metric-strip__value${
                tile.tone ? ` metric-strip__value--${tile.tone}` : ""
              }`}
            >
              {tile.count}
            </span>
          </button>
        ))}
      </div>

      <section className="inbox-surface">
        <div className="inbox-kind-row" role="tablist" aria-label="按类型筛选">
          <span className="inbox-kind-label">类型</span>
          {KIND_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              role="tab"
              aria-selected={activeFilter === filter.key}
              className={`tag-chip message-filter-chip${
                activeFilter === filter.key ? " is-active" : ""
              }`}
              onClick={() => selectFilter(filter.key)}
            >
              {filter.label} <span className="tabular-nums">{counts[filter.key]}</span>
            </button>
          ))}
        </div>

        <div className="panel-heading" style={{ padding: "12px 18px 0" }}>
          <div>
            <p className="eyebrow-text">当前视图</p>
            <h3 className="panel-title">{headingTitle}</h3>
          </div>
        </div>

        <InboxList
          items={visibleItems}
          pendingItemId={pendingItemId}
          onRead={(itemId) => markItemsRead([itemId])}
          onArchive={archiveItem}
          showArchiveAction={activeFilter !== "archived"}
        />

        {filteredItems.length > PAGE_SIZE ? (
          <div className="pagination-bar" aria-label="关注事项分页">
            <span>
              第 {currentPage} / {pageCount} 页，共 {filteredItems.length} 条
            </span>
            <div className="pagination-actions">
              <button
                type="button"
                className="secondary-action"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                上一页
              </button>
              <button
                type="button"
                className="secondary-action"
                disabled={currentPage >= pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              >
                下一页
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
