"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { changePasswordAction, revokeSessionAction } from "../app/actions";
import { formatDateTime } from "../lib/format";

type Session = {
  id: string;
  jti: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  active: boolean;
};

type LoginHistoryItem = {
  id: string;
  occurredAt: string;
  method: string;
};

export function ProfileSecurityPanel({
  sessions,
  loginHistory,
}: {
  sessions: Session[];
  loginHistory: LoginHistoryItem[];
}) {
  const [isPending, startTransition] = useTransition();

  function submitPassword(formData: FormData) {
    startTransition(async () => {
      const result = await changePasswordAction(formData);
      if (result?.ok === false) {
        toast.error(result.error);
        return;
      }
      toast.success("密码已更新。出于安全考虑，刷新会话已被吊销。");
    });
  }

  function revokeSession(formData: FormData) {
    startTransition(async () => {
      const result = await revokeSessionAction(formData);
      if (result?.ok === false) {
        toast.error(result.error);
        return;
      }
      toast.success("会话已远程登出。");
    });
  }

  return (
    <section className="content-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow-text">账号安全</p>
            <h3 className="panel-title">修改密码</h3>
          </div>
        </div>
        <form action={submitPassword} className="form-stack">
          <label className="field-label">
            当前密码
            <input
              className="field-control"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
            />
          </label>
          <label className="field-label">
            新密码
            <input
              className="field-control"
              name="newPassword"
              type="password"
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className="action-button" disabled={isPending}>
            {isPending ? "提交中..." : "更新密码"}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow-text">会话</p>
            <h3 className="panel-title">活跃 Session</h3>
          </div>
        </div>
        <div className="compact-stack">
          {sessions.length === 0 ? (
            <div className="empty-state">暂无刷新会话。</div>
          ) : (
            sessions.map((session) => (
              <div className="list-card" key={session.id}>
                <div className="list-card-head">
                  <div>
                    <strong>{session.active ? "活跃" : "已失效"}</strong>
                    <p className="metric-note">创建：{formatDateTime(session.createdAt)}</p>
                    <p className="metric-note">过期：{formatDateTime(session.expiresAt)}</p>
                  </div>
                  {session.active ? (
                    <form action={revokeSession}>
                      <input type="hidden" name="sessionId" value={session.id} />
                      <button
                        type="submit"
                        className="action-button ghost-button"
                        disabled={isPending}
                      >
                        远程登出
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow-text">登录历史</p>
            <h3 className="panel-title">最近登录</h3>
          </div>
        </div>
        <div className="compact-stack">
          {loginHistory.length === 0 ? (
            <div className="empty-state">暂无登录历史。</div>
          ) : (
            loginHistory.map((item) => (
              <div className="workspace-kv-row" key={item.id}>
                <span>{formatDateTime(item.occurredAt)}</span>
                <strong>{item.method}</strong>
              </div>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
