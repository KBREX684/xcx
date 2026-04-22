import Link from "next/link";
import { type EventTimelineItem } from "@agent-control-plane/domain";
import { AppShell } from "../components/app-shell";
import {
  ArrowRightIcon,
  BotIcon,
  CertificateIcon,
  CheckCircleIcon,
  ClockIcon,
  FolderIcon,
  SettingsIcon,
  ShieldIcon,
  UserIcon,
  WorkflowIcon
} from "../components/icons";
import { StatusPill } from "../components/status-pill";
import { getCertificates, getDashboardSummary } from "../lib/api";
import { formatRelativeTime, shortTrace } from "../lib/format";

const PROFILE_NAME = "KBREX";

function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("zh-CN", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Asia/Shanghai"
    }).format(new Date())
  );

  if (hour < 6) {
    return "夜深了";
  }

  if (hour < 12) {
    return "上午好";
  }

  if (hour < 18) {
    return "下午好";
  }

  return "晚上好";
}

function getProjectProgress(taskCount: number, completedTaskCount: number, status: string) {
  if (status === "delivered" || status === "completed") {
    return 100;
  }

  if (taskCount <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((completedTaskCount / taskCount) * 100)));
}

function getActivityPresentation(event: EventTimelineItem) {
  const loweredType = event.eventType.toLowerCase();

  if (loweredType.includes("approval") || loweredType.includes("approve")) {
    return {
      tone: "success",
      Icon: ClockIcon,
      actorIcon: UserIcon
    };
  }

  if (loweredType.includes("certificate")) {
    return {
      tone: "indigo",
      Icon: ShieldIcon,
      actorIcon: ShieldIcon
    };
  }

  if (loweredType.includes("run") || loweredType.includes("workflow")) {
    return {
      tone: "indigo",
      Icon: WorkflowIcon,
      actorIcon: BotIcon
    };
  }

  return {
    tone: "success",
    Icon: CheckCircleIcon,
    actorIcon: event.actorType === "system" ? BotIcon : UserIcon
  };
}

export default async function HomePage() {
  const [dashboard, certificates] = await Promise.all([getDashboardSummary(), getCertificates()]);
  const latestCertificate = certificates[0] ?? null;
  const greeting = getGreeting();

  const overviewCards = [
    {
      label: "项目总数",
      value: dashboard.totalProjectCount,
      note: `活跃项目 ${dashboard.activeProjectCount} 个`,
      tone: "indigo",
      Icon: FolderIcon
    },
    {
      label: "运行中任务",
      value: dashboard.runningExecutionCount,
      note:
        dashboard.runningExecutionCount > 0
          ? "执行链路正在持续推进"
          : "当前没有正在运行的执行项",
      tone: "success",
      Icon: WorkflowIcon
    },
    {
      label: "待审批",
      value: dashboard.pendingApprovalCount,
      note:
        dashboard.pendingApprovalCount > 0
          ? `有 ${dashboard.pendingApprovalCount} 项等待人工确认`
          : "当前没有阻塞审批",
      tone: "warning",
      Icon: ClockIcon
    },
    {
      label: "已签发证书",
      value: certificates.length,
      note: latestCertificate ? `最近更新于 ${formatRelativeTime(latestCertificate.updatedAt)}` : "暂无证书记录",
      tone: "neutral",
      Icon: ShieldIcon
    }
  ] as const;

  const quickActions = [
    {
      title: "新建项目",
      description: "快速建立新的交付条目并进入项目空间。",
      href: "/projects",
      Icon: FolderIcon
    },
    {
      title: "新建工作流",
      description: "维护交付流程模板与审批节点节奏。",
      href: "/workflows",
      Icon: WorkflowIcon
    },
    {
      title: "添加智能体",
      description: "查看并扩充当前团队中的 Agent 能力。",
      href: "/agents",
      Icon: BotIcon
    },
    {
      title: "配置集成",
      description: "管理 API、MCP 与回调连接参数。",
      href: "/settings/integrations",
      Icon: SettingsIcon
    }
  ] as const;

  return (
    <AppShell
      activeNav="dashboard"
      navBadges={{ messages: dashboard.pendingApprovalCount }}
      title={`${greeting}，${PROFILE_NAME}`}
      description={`这里是你的 AI Agent 团队指挥台，用来管理项目、团队与交付成果。当前工作空间为 ${dashboard.workspaceName}。`}
    >
      <section className="workspace-header">
        <div className="workspace-header-copy">
          <p className="workspace-kicker">Agent Delivery OS</p>
          <h2 className="workspace-title">进入今天的工作台，保持项目推进、审批协作与智能体执行处于同一节奏。</h2>
          <p className="workspace-body">
            这是一个面向高频工作的控制台首页。你可以从这里查看项目状态、审批阻塞、最近动态与常用操作入口。
          </p>
        </div>
      </section>

      <section className="metric-grid">
        {overviewCards.map((card) => {
          const Icon = card.Icon;

          return (
            <article key={card.label} className="metric-panel">
              <div className="metric-panel-head">
                <div className="metric-panel-copy">
                  <p className="metric-panel-label">{card.label}</p>
                  <div className="metric-panel-value">{card.value}</div>
                </div>
                <span className="metric-panel-icon" data-tone={card.tone}>
                  <Icon />
                </span>
              </div>
              <p className="metric-panel-note">{card.note}</p>
            </article>
          );
        })}
      </section>

      <section className="workspace-grid">
        <article className="surface-card surface-card-emphasis">
          <div className="surface-card-head">
            <div>
              <h2 className="surface-card-title">最近项目</h2>
              <p className="surface-card-description">优先查看正在推进、待审批或刚完成交付的项目。</p>
            </div>
          </div>

          {dashboard.spotlightProjects.length === 0 ? (
            <div className="empty-state">当前还没有项目，先前往项目列表创建一个新的交付项目。</div>
          ) : (
            <div className="project-feed">
              {dashboard.spotlightProjects.slice(0, 5).map((project) => {
                const progress = getProjectProgress(
                  project.taskCount,
                  project.completedTaskCount,
                  project.status
                );
                const ProjectIcon =
                  progress >= 100 ? CertificateIcon : project.pendingApprovalCount > 0 ? WorkflowIcon : FolderIcon;

                return (
                  <Link key={project.id} href={`/projects/${project.id}`} className="project-feed-item">
                    <span className="list-icon-chip" data-tone={progress >= 100 ? "success" : "indigo"}>
                      <ProjectIcon />
                    </span>

                    <div className="project-feed-main">
                      <div className="project-feed-top">
                        <div>
                          <h3 className="list-item-title">{project.name}</h3>
                          <p className="list-item-meta">
                            {project.customerName} · 更新于 {formatRelativeTime(project.lastEventAt)}
                          </p>
                        </div>
                        <StatusPill status={project.latestRunStatus ?? project.status} />
                      </div>

                      <div className="project-feed-progress">
                        <div className="progress-track">
                          <span
                            className="progress-fill"
                            data-tone={progress >= 100 ? "success" : "indigo"}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="progress-value">{progress}%</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="surface-card-footer">
            <Link href="/projects" className="quiet-link">
              查看全部项目
              <ArrowRightIcon />
            </Link>
          </div>
        </article>

        <article className="surface-card">
          <div className="surface-card-head">
            <div>
              <h2 className="surface-card-title">最近动态</h2>
              <p className="surface-card-description">以工作流活动流的方式查看关键动作、审批变化与签发结果。</p>
            </div>
          </div>

          {dashboard.recentEvents.length === 0 ? (
            <div className="empty-state">当前还没有动态记录，项目创建、执行和审批都会展示在这里。</div>
          ) : (
            <div className="activity-feed">
              {dashboard.recentEvents.slice(0, 4).map((event) => {
                const presentation = getActivityPresentation(event);
                const Icon = presentation.Icon;
                const ActorIcon = presentation.actorIcon;

                return (
                  <article key={event.id} className="activity-feed-item">
                    <span className="list-icon-chip" data-tone={presentation.tone}>
                      <Icon />
                    </span>

                    <div className="activity-feed-main">
                      <h3 className="list-item-title">{event.summary}</h3>
                      <p className="list-item-meta">
                        追踪标识 {shortTrace(event.traceId, 8)} · {formatRelativeTime(event.occurredAt)}
                      </p>
                    </div>

                    <span className="activity-source-badge" data-tone={event.actorType === "system" ? "system" : "user"}>
                      <ActorIcon />
                    </span>
                  </article>
                );
              })}
            </div>
          )}

          <div className="surface-card-footer">
            <Link href="/messages" className="quiet-link">
              查看全部动态
              <ArrowRightIcon />
            </Link>
          </div>
        </article>
      </section>

      <section className="surface-card">
        <div className="surface-card-head">
          <div>
            <h2 className="surface-card-title">快捷操作</h2>
            <p className="surface-card-description">聚焦高频动作，不打断你的工作流。</p>
          </div>
        </div>

        <div className="shortcut-grid">
          {quickActions.map((action) => {
            const Icon = action.Icon;

            return (
              <Link key={action.title} href={action.href} className="shortcut-card">
                <span className="list-icon-chip" data-tone="indigo">
                  <Icon />
                </span>
                <div className="shortcut-card-copy">
                  <h3 className="list-item-title">{action.title}</h3>
                  <p className="list-item-meta">{action.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
