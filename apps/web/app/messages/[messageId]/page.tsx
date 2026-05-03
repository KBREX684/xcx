import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { CopyId } from "../../../components/copy-id";
import { StatusPill } from "../../../components/status-pill";
import { getDashboardSummary, getMessage } from "../../../lib/api";
import { formatDateTime, shortTrace } from "../../../lib/format";

type MessageTab = "body" | "evidence" | "artifacts";

const MESSAGE_TABS: Array<{ key: MessageTab; label: string }> = [
  { key: "body", label: "正文与上文" },
  { key: "evidence", label: "关联执行" },
  { key: "artifacts", label: "完整产物" },
];

type MessageDetailPageProps = {
  params: Promise<{
    messageId: string;
  }>;
  searchParams?: Promise<{ tab?: string }>;
};

function getAuthorTypeLabel(authorType: string) {
  switch (authorType) {
    case "agent":
      return "智能体回复";
    case "member":
      return "成员消息";
    case "worker":
      return "执行器消息";
    case "system":
      return "系统消息";
    default:
      return "消息";
  }
}

export default async function MessageDetailPage({
  params,
  searchParams,
}: MessageDetailPageProps) {
  const { messageId } = await params;
  const sp = (await searchParams) ?? {};
  const decodedMessageId = decodeURIComponent(messageId);
  const [dashboard, message] = await Promise.all([
    getDashboardSummary(),
    getMessage(decodedMessageId).catch(() => null),
  ]);

  if (!message) {
    notFound();
  }

  const requestedTab = (sp.tab ?? "body") as MessageTab;
  const activeTab: MessageTab = MESSAGE_TABS.some((tab) => tab.key === requestedTab)
    ? requestedTab
    : "body";

  const taskHref = `/projects/${message.projectId}/tasks/${message.taskId}`;
  const readableArtifacts = message.relatedRuns.flatMap((run) =>
    run.artifacts
      .filter((artifact) => artifact.contents?.trim())
      .map((artifact) => ({ run, artifact })),
  );

  const counts: Record<MessageTab, number> = {
    body: message.replyToMessage ? 2 : 1,
    evidence: message.relatedRuns.length,
    artifacts: readableArtifacts.length,
  };

  const baseHref = `/messages/${encodeURIComponent(message.id)}`;
  const buildTabHref = (tab: MessageTab) => (tab === "body" ? baseHref : `${baseHref}?tab=${tab}`);

  return (
    <AppShell
      activeNav="messages"
      navBadges={{ messages: dashboard.pendingApprovalCount }}
      title="消息详情"
      description="查看任务线程中的完整消息、回复上下文、关联执行记录与产物正文。"
      breadcrumbs={[
        { label: "事项", href: "/issues" },
        { label: message.taskTitle, href: taskHref },
        { label: "消息详情" },
      ]}
    >
      <div className="detail-back-row">
        <Link href={taskHref} className="ghost-button">
          返回任务线程
        </Link>
      </div>

      <section className="message-detail-head">
        <p className="acp-list-head__kicker">{getAuthorTypeLabel(message.authorType)}</p>
        <h2 className="message-detail-title">{message.authorName}</h2>
        <div className="message-detail-meta">
          <span>所属项目：{message.projectName}</span>
          <span>项目编号：{message.projectCode}</span>
          <span>所属任务：{message.taskTitle}</span>
          <span suppressHydrationWarning>发送时间：{formatDateTime(message.createdAt)}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            消息编号：
            <CopyId
              value={message.id}
              label="消息编号"
              displayText={shortTrace(message.id, 12)}
            />
          </span>
        </div>
      </section>

      <nav className="segmented-control message-detail-tabs" aria-label="消息内容视图">
        {MESSAGE_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={buildTabHref(tab.key)}
            data-active={activeTab === tab.key ? "true" : undefined}
          >
            {tab.label}
            <span className="segmented-count">{counts[tab.key]}</span>
          </Link>
        ))}
      </nav>

      {activeTab === "body" ? (
        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">本条消息</p>
                <h3 className="panel-title">正文</h3>
              </div>
            </div>
            <pre className="message-detail-pre">{message.body}</pre>
          </section>

          {message.replyToMessage ? (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow-text">上文</p>
                  <h3 className="panel-title">回复来源</h3>
                </div>
              </div>
              <div className="detail-block">
                <p className="supporting-text">
                  {message.replyToMessage.authorName} ·{" "}
                  {formatDateTime(message.replyToMessage.createdAt)}
                </p>
                <pre className="message-detail-pre">{message.replyToMessage.body}</pre>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {activeTab === "evidence" ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow-text">证据</p>
              <h3 className="panel-title">关联执行与产物</h3>
            </div>
          </div>
          {message.relatedRuns.length === 0 ? (
            <div className="empty-state">
              这条消息没有找到关联执行记录。若它是人工评论，这是正常情况。
            </div>
          ) : (
            <div className="list-stack">
              {message.relatedRuns.map((run) => (
                <article key={run.id} className="list-card">
                  <div className="list-card-head">
                    <div>
                      <h4 className="list-card-title">{run.agentName}</h4>
                      <p className="supporting-text">
                        节点 {run.nodeKey} · {formatDateTime(run.finishedAt ?? run.createdAt)}
                      </p>
                    </div>
                    <StatusPill status={run.status} />
                  </div>
                  {run.outputSummary ? (
                    <p className="thread-message-body">{run.outputSummary}</p>
                  ) : null}
                  <div className="link-row">
                    <Link href={`/runs/${run.id}`} className="inline-link">
                      查看执行记录
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "artifacts" ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow-text">完整产物正文</p>
              <h3 className="panel-title">可展开审阅的 Agent 输出</h3>
            </div>
          </div>
          {readableArtifacts.length === 0 ? (
            <div className="empty-state">暂未找到可直接预览的文本产物。</div>
          ) : (
            <div className="list-stack">
              {readableArtifacts.map(({ run, artifact }, index) => (
                <details
                  key={`${run.id}:${artifact.id}`}
                  className="inline-disclosure message-artifact-detail"
                  open={index === 0}
                >
                  <summary className="inline-disclosure-trigger">
                    {artifact.title} · {run.agentName}
                  </summary>
                  <div className="inline-disclosure-body">
                    <div className="link-row">
                      <Link href={`/artifacts/${artifact.id}`} className="inline-link">
                        打开产物详情
                      </Link>
                      <Link href={`/runs/${run.id}`} className="inline-link">
                        打开执行记录
                      </Link>
                    </div>
                    <pre className="message-detail-pre">{artifact.contents}</pre>
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </AppShell>
  );
}
