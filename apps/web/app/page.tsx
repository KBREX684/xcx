import { getProjects } from "../lib/api";
import { CreateProjectForm } from "../components/create-project-form";
import { StatusPill } from "../components/status-pill";

export default async function HomePage() {
  const projects = await getProjects();

  const totalPending = projects.reduce((sum, project) => sum + project.pendingApprovalCount, 0);
  const activeProjects = projects.filter((project) => project.status === "active").length;

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div>
          <div className="workspace-kicker">Agent Delivery OS</div>
          <div className="workspace-mark">Studio Zero · P1 本地控制平面</div>
        </div>
        <div className="workspace-mark">SQLite + Worker Polling + Huashu Control Surface</div>
      </header>

      <section className="hero-grid">
        <div className="hero-panel">
          <div className="workspace-kicker">Workspace Overview</div>
          <h1 className="hero-title">让 Agent 的执行过程，像真正的交付中台一样可见。</h1>
          <p className="hero-copy">
            P1 不追求一口气做完全部平台能力，而是先把最关键的控制面跑通：项目建档、流程触发、Run 执行、
            人工审批、产物留痕和事件时间线。这一版已经按真实运行节奏来组织界面，而不是静态展示稿。
          </p>
          <div className="hero-rail">
            <div className="hero-stat">
              <div className="hero-stat-label">Active Projects</div>
              <div className="hero-stat-value">{activeProjects}</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">Pending Approval</div>
              <div className="hero-stat-value">{totalPending}</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">Control Surface</div>
              <div className="hero-stat-value">{projects.length > 0 ? "Live" : "Booting"}</div>
            </div>
          </div>
        </div>

        <aside className="signal-panel">
          <div className="signal-headline">
            <div>
              <div className="workspace-kicker">P1 Focus</div>
              <h2 className="signal-title">不是普通后台，而是项目驾驶舱。</h2>
              <p className="signal-copy">
                这一版 Web 会优先展示 cockpit、事件链和审批决策，不把高价值信息埋进平铺表格。
              </p>
            </div>
            <span className="signal-chip">Huashu</span>
          </div>
          <div className="signal-list">
            <div className="signal-item">
              <div className="signal-metric">闭环对象</div>
              <strong>Project → Task → Run → Approval → Artifact</strong>
            </div>
            <div className="signal-item">
              <div className="signal-metric">P1 不做</div>
              <strong>小程序代码、证书生成、MCP Relay、完整权限体系</strong>
            </div>
            <div className="signal-item">
              <div className="signal-metric">本地策略</div>
              <strong>SQLite + 文件产物 + 轮询 worker，先保证一键跑通</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="workspace-main">
        <div className="section-panel">
          <div className="section-header">
            <div>
              <div className="workspace-kicker">Projects</div>
              <h2 className="section-title">项目看板入口</h2>
            </div>
            <div className="section-meta">点击任一项目进入 cockpit</div>
          </div>

          <div className="project-list">
            {projects.map((project) => (
              <a key={project.id} href={`/projects/${project.id}`} className="project-card">
                <div className="project-card-head">
                  <div>
                    <div className="project-card-code">{project.projectCode}</div>
                    <h3 className="project-card-title">{project.name}</h3>
                  </div>
                  <StatusPill status={project.latestRunStatus ?? project.status} />
                </div>
                <p className="project-card-copy">
                  面向 {project.customerName} 的交付项目，当前累计 {project.taskCount} 个任务，其中已完成 {project.completedTaskCount} 个。
                </p>
                <div className="project-card-grid">
                  <div className="project-card-metric">
                    <span className="metric-label">待审批</span>
                    <span className="metric-value">{project.pendingApprovalCount}</span>
                  </div>
                  <div className="project-card-metric">
                    <span className="metric-label">最新 Run</span>
                    <span className="metric-value">{project.latestRunStatus ?? "暂无"}</span>
                  </div>
                  <div className="project-card-metric">
                    <span className="metric-label">最近事件</span>
                    <span className="metric-value">{project.lastEventAt ? "已更新" : "未开始"}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        <aside className="edge-panel">
          <div>
            <div className="workspace-kicker">New Project</div>
            <h2 className="section-title">创建一个新项目</h2>
          </div>
          <CreateProjectForm />
          <div className="stack-list">
            <div className="stack-item">
              <strong>默认模板</strong>
              <p>创建后可直接触发“小程序项目交付流程（简化版）”。worker 会生成交付摘要并推入待审批。</p>
            </div>
            <div className="stack-item">
              <strong>冻结的小程序契约</strong>
              <p>P1 已稳定项目摘要、待审批列表、Run 摘要和审批动作的共享类型，P2 可直接起 Taro。</p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

