import { AppShell } from "../../components/app-shell";

export default function ProfilePage() {
  return (
    <AppShell
      activeNav="none"
      title="个人资料"
      description="查看当前账号、工作空间与偏好设置入口。"
      breadcrumbs={[{ label: "个人资料" }]}
    >
      <section className="metrics-grid">
        <article className="metric-card">
          <div className="metric-label">账号名称</div>
          <div className="metric-value metric-value-text">KBREX</div>
          <p className="metric-note">主账号，拥有工作区管理权限</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">邮箱</div>
          <div className="metric-value metric-value-text">kbrex@example.com</div>
          <p className="metric-note">用于登录、通知与审批提醒</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">当前工作空间</div>
          <div className="metric-value metric-value-text">KBREX Studio</div>
          <p className="metric-note">单工作区开发模式（P2）</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">角色</div>
          <div className="metric-value metric-value-text">管理员</div>
          <p className="metric-note">可管理项目、审批与集成配置</p>
        </article>
      </section>

      <section className="content-grid">
        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">账户信息</p>
                <h3 className="panel-title">基础身份资料</h3>
              </div>
            </div>
            <div className="meta-column">
              <span>用户名：KBREX</span>
              <span>邮箱：kbrex@example.com</span>
              <span>工作空间：KBREX Studio</span>
              <span>角色：工作空间管理员</span>
            </div>
            <div className="soft-note">
              P2 先稳定资料展示与偏好入口，后续再接入可编辑资料、头像上传和通知策略细分。
            </div>
          </section>
        </div>

        <div className="stack-panel">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-text">偏好设置</p>
                <h3 className="panel-title">主题与通知</h3>
              </div>
            </div>
            <div className="detail-block">
              <p>主题偏好：支持浅色 / 深色切换，跟随系统作为首次默认策略。</p>
            </div>
            <div className="detail-block">
              <p>通知偏好：审批提醒、Agent 状态、系统通知统一收敛到消息中心。</p>
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
