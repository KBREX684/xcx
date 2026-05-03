import { getApiBaseUrl } from "@agent-control-plane/config";
import { redirect } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { ProfileSecurityPanel } from "../../components/profile-security-panel";
import { getSessionToken } from "../../lib/auth";

type MeResponse = {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  requirePasswordReset: boolean;
  workspace: {
    id: string;
    name: string;
    slug: string;
    planType: string;
    status: string;
  };
};

type SessionResponse = {
  id: string;
  jti: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  active: boolean;
};

type LoginHistoryResponse = {
  id: string;
  occurredAt: string;
  method: string;
};

async function apiGet<T>(path: string): Promise<T | null> {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (response.status === 401) {
    redirect("/logout?reason=session_expired");
  }

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

export default async function ProfilePage() {
  const [me, sessions, loginHistory] = await Promise.all([
    apiGet<MeResponse>("/auth/me"),
    apiGet<SessionResponse[]>("/auth/sessions"),
    apiGet<LoginHistoryResponse[]>("/auth/login-history"),
  ]);

  return (
    <AppShell
      activeNav="none"
      title="个人资料"
      description="查看当前账号、所属工作区与安全状态。"
      breadcrumbs={[{ label: "个人资料" }]}
      profileName={me?.name}
      profileEmail={me?.email}
      workspaceName={me?.workspace.name}
    >
      <section className="metrics-grid">
        <article className="metric-card">
          <div className="metric-label">账号</div>
          <div className="metric-value metric-value-text">{me?.name ?? "暂不可用"}</div>
          <p className="metric-note">{me?.email ?? "无法读取当前会话。"}</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">工作区</div>
          <div className="metric-value metric-value-text">{me?.workspace.name ?? "暂不可用"}</div>
          <p className="metric-note">{me?.workspace.slug ?? "未关联工作区。"}</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">角色</div>
          <div className="metric-value metric-value-text">{me?.role ?? "未知"}</div>
          <p className="metric-note">所有工作区数据均按 JWT 中的工作区上下文解析。</p>
        </article>
        <article className="metric-card">
          <div className="metric-label">安全</div>
          <div className="metric-value metric-value-text">
            {me?.requirePasswordReset ? "需要重置密码" : "正常"}
          </div>
          <p className="metric-note">退出登录会立即吊销当前服务端会话。</p>
        </article>
      </section>
      <ProfileSecurityPanel sessions={sessions ?? []} loginHistory={loginHistory ?? []} />
    </AppShell>
  );
}
