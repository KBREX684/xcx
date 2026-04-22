import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { StatusPill } from "../../components/status-pill";
import { getApprovals, getDashboardSummary } from "../../lib/api";
import { formatDateTime, formatRelativeTime, shortTrace } from "../../lib/format";

type MessageCategory = "approval" | "agent" | "system" | "activity";

type MessageItem = {
  id: string;
  category: MessageCategory;
  title: string;
  subtitle: string;
  time: string;
  href?: string;
  status?: string;
};

function buildMessages({
  pendingApprovalCount,
  approvals,
  dashboard
}: {
  pendingApprovalCount: number;
  approvals: Awaited<ReturnType<typeof getApprovals>>;
  dashboard: Awaited<ReturnType<typeof getDashboardSummary>>;
}) {
  const approvalMessages: MessageItem[] = approvals.pending.map((item) => ({
    id: `approval-${item.runId}`,
    category: "approval",
    title: `待审批：${item.taskTitle}`,
    subtitle: `${item.projectName} · ${item.agentName} 提交`,
    time: formatRelativeTime(item.requestedAt),
    href: `/runs/${item.runId}`,
    status: "waiting_approval"
  }));

  const agentMessages: MessageItem[] = dashboard.recentEvents
    .filter((event) => event.actorType === "system")
    .map((event) => ({
      id: `agent-${event.id}`,
      category: "agent",
      title: event.summary,
      subtitle: `追踪标识 ${shortTrace(event.traceId, 10)}`,
      time: formatRelativeTime(event.occurredAt)
    }));

  const systemMessages: MessageItem[] = [
    {
      id: "system-workspace-health",
      category: "system",
      title: pendingApprovalCount > 0 ? "系统提醒：存在待处理审批" : "系统状态正常",
      subtitle:
        pendingApprovalCount > 0
          ? `当前有 ${pendingApprovalCount} 项执行记录等待人工决策`
          : "当前没有阻塞项，工作流可以继续推进",
      time: "刚刚",
      href: pendingApprovalCount > 0 ? "/approvals" : undefined
    },
    ...dashboard.certificateHighlights.slice(0, 2).map((item) => ({
      id: `certificate-${item.id}`,
      category: "system" as const,
      title: `证书更新：${item.title}`,
      subtitle: `${item.projectName} · 核验码 ${item.verificationCode}`,
      time: formatRelativeTime(item.updatedAt),
      href: "/certificates",
      status: item.status
    }))
  ];

  const activityMessages: MessageItem[] = dashboard.recentEvents.map((event) => ({
    id: `activity-${event.id}`,
    category: "activity",
    title: event.summary,
    subtitle: `追踪标识 ${shortTrace(event.traceId, 10)}`,
    time: formatDateTime(event.occurredAt)
  }));

  const allMessages = [...approvalMessages, ...agentMessages, ...systemMessages, ...activityMessages];

  return {
    allMessages,
    approvalMessages,
    agentMessages,
    systemMessages,
    activityMessages
  };
}

function MessageList({ items }: { items: MessageItem[] }) {
  if (items.length === 0) {
    return <div className="empty-state">当前没有该类型消息。</div>;
  }

  return (
    <div className="list-stack">
      {items.map((item) => (
        <article key={item.id} className="list-card">
          <div className="list-card-head">
            <div>
              <h4 className="list-card-title">{item.title}</h4>
              <p className="supporting-text">{item.subtitle}</p>
            </div>
            {item.status ? <StatusPill status={item.status} /> : null}
          </div>
          <div className="meta-row">
            <span>{item.time}</span>
          </div>
          {item.href ? (
            <div className="link-row">
              <Link href={item.href} className="inline-link">
                查看详情
              </Link>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export default async function MessagesPage() {
  const [dashboard, approvals] = await Promise.all([getDashboardSummary(), getApprovals()]);
  const pendingApprovalCount = approvals.pending.length;
  const messages = buildMessages({ pendingApprovalCount, approvals, dashboard });

  return (
    <AppShell
      activeNav="messages"
      navBadges={{ messages: pendingApprovalCount }}
      title="消息"
      description="统一查看审批提醒、Agent 通知、系统通知与最近动态。"
      breadcrumbs={[{ label: "消息" }]}
    >
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow-text">消息分组</p>
            <h3 className="panel-title">按语义快速筛查</h3>
          </div>
        </div>
        <div className="tag-row message-filter-row">
          <span className="tag-chip message-filter-chip is-active">全部 {messages.allMessages.length}</span>
          <span className="tag-chip message-filter-chip">审批提醒 {messages.approvalMessages.length}</span>
          <span className="tag-chip message-filter-chip">Agent 通知 {messages.agentMessages.length}</span>
          <span className="tag-chip message-filter-chip">系统通知 {messages.systemMessages.length}</span>
          <span className="tag-chip message-filter-chip">最近动态 {messages.activityMessages.length}</span>
        </div>
      </section>

      <section className="content-grid">
        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">全部消息</p>
                <h3 className="panel-title">综合时间线</h3>
              </div>
            </div>
            <MessageList items={messages.allMessages.slice(0, 8)} />
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">审批提醒</p>
                <h3 className="panel-title">需要你处理的决策点</h3>
              </div>
              <Link href="/approvals" className="inline-link">
                打开审批中心
              </Link>
            </div>
            <MessageList items={messages.approvalMessages} />
          </section>
        </div>

        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">Agent 通知</p>
                <h3 className="panel-title">自动执行动态</h3>
              </div>
            </div>
            <MessageList items={messages.agentMessages.slice(0, 6)} />
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">系统通知</p>
                <h3 className="panel-title">平台状态与证书更新</h3>
              </div>
            </div>
            <MessageList items={messages.systemMessages.slice(0, 4)} />
          </section>
        </div>
      </section>
    </AppShell>
  );
}
