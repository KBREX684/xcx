"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { BrandLockup } from "../../components/brand-mark";
import { loginAction } from "../../lib/auth";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [nextPath, setNextPath] = useState("/");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null);
      const result = await loginAction(formData);
      if (result?.ok === false) {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("reason");
    const next = params.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      setNextPath(next);
    }
    if (reason === "session_expired") {
      const message = "会话已过期，请重新登录。";
      setError(message);
      toast.error(message);
    }
  }, []);

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <header className="auth-card__header">
          <BrandLockup className="auth-brand" size="hero" />
          <p className="auth-card__eyebrow">企业智能体控制台</p>
          <h1 id="login-title" className="auth-card__title">
            登录到蜂聚合指挥台
          </h1>
          <p className="auth-card__description">
            使用工作区账户登录，继续管理你的 SwarmHive 智能体团队与项目交付。
          </p>
        </header>

        {error ? (
          <div className="auth-error" role="alert">
            {error}
          </div>
        ) : null}

        <form action={handleSubmit} className="form-stack" noValidate>
          <input type="hidden" name="next" value={nextPath} />

          <label className="field-label" htmlFor="email">
            <span>邮箱</span>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@example.com"
              className="field-input"
              aria-label="邮箱地址"
            />
          </label>

          <label className="field-label" htmlFor="password">
            <span>密码</span>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={10}
              placeholder="至少 10 位，含大小写、数字与符号"
              className="field-input"
              aria-label="登录密码"
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="action-button"
            aria-busy={isPending}
          >
            {isPending ? "登录中…" : "登录"}
          </button>
        </form>

        <p className="auth-card__footer">
          暂不开放自助注册；如需加入工作区，请联系管理员创建账号。
        </p>
      </section>
    </main>
  );
}
