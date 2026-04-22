import { AppShell } from "../../components/app-shell";

export default function ProfilePage() {
  return (
    <AppShell
      activeNav="dashboard"
      title="个人资料"
      description="查看当前身份与工作空间信息。"
      breadcrumbs={[{ label: "工作台", href: "/" }, { label: "个人资料" }]}
    >
      <section className="surface-card">
        <div className="surface-card-head">
          <div>
            <h2 className="surface-card-title">当前账号</h2>
            <p className="surface-card-description">这里展示当前工作空间中的基础身份信息与使用说明。</p>
          </div>
        </div>

        <div className="compact-stack">
          <div className="subtle-note">
            当前账号：KBREX
            <br />
            工作空间：KBREX Studio
            <br />
            角色：工作空间管理员
          </div>
          <div className="subtle-note">
            后续可以在这里继续补全头像、联系方式、偏好设置与个人通知策略。
          </div>
        </div>
      </section>
    </AppShell>
  );
}
