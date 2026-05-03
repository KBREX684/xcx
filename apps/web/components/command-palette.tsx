"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PaletteEntry = {
  id?: string;
  label: string;
  description?: string;
  href: string;
  keywords: string;
  group: string;
};

type CommandSearchItem = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
  action: string;
  keywords: string[];
};

const ENTRIES: PaletteEntry[] = [
  {
    label: "控制台概览",
    description: "查看工作台首页",
    href: "/dashboard",
    keywords: "dashboard home overview 概览 首页",
    group: "导航",
  },
  {
    label: "项目列表",
    description: "所有项目与交付进度",
    href: "/projects",
    keywords: "projects 项目 list",
    group: "导航",
  },
  {
    label: "审批中心",
    description: "待审批的运行请求",
    href: "/approvals",
    keywords: "approvals 审批",
    group: "导航",
  },
  {
    label: "智能体目录",
    description: "查看与管理智能体",
    href: "/agents",
    keywords: "agents ai bots 智能体",
    group: "导航",
  },
  {
    label: "流程模板",
    description: "运行编排模板",
    href: "/workflows",
    keywords: "workflows 流程 工作流",
    group: "导航",
  },
  {
    label: "证明书中心",
    description: "签发与核验证书",
    href: "/certificates",
    keywords: "certificates 证书 签发",
    group: "导航",
  },
  {
    label: "收件箱",
    description: "提及、通知、运行通讯",
    href: "/messages",
    keywords: "messages inbox 消息 收件箱",
    group: "导航",
  },
  {
    label: "团队管理",
    description: "成员、角色与授权",
    href: "/teams",
    keywords: "team members 团队 成员",
    group: "导航",
  },
  {
    label: "设置",
    description: "工作区、集成、告警",
    href: "/settings",
    keywords: "settings 设置 集成",
    group: "导航",
  },
  {
    label: "个人资料",
    description: "修改密码与会话",
    href: "/profile",
    keywords: "profile account 个人",
    group: "账号",
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [remoteEntries, setRemoteEntries] = useState<PaletteEntry[]>([]);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isCmdK) {
        event.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (event.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const handle = window.setTimeout(() => {
      fetch(`/api/command/search${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`, {
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { items?: CommandSearchItem[] } | null) => {
          const items = payload?.items ?? [];
          setRemoteEntries(
            items.map((item) => ({
              id: `${item.type}-${item.id}`,
              label: item.title,
              description: item.subtitle,
              href: item.href,
              keywords: item.keywords.join(" "),
              group: item.type === "action" ? "动作" : "搜索",
            })),
          );
        })
        .catch((error: unknown) => {
          if ((error as { name?: string }).name !== "AbortError") {
            setRemoteEntries([]);
          }
        });
    }, 120);

    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [open, query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = remoteEntries.length > 0 ? remoteEntries : ENTRIES;
    if (!q || remoteEntries.length > 0) return source;
    return source.filter((entry) =>
      `${entry.label} ${entry.description ?? ""} ${entry.keywords}`.toLowerCase().includes(q),
    );
  }, [query, remoteEntries]);

  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(0);
    }
  }, [filtered, activeIndex]);

  function navigate(entry: PaletteEntry) {
    setOpen(false);
    router.push(entry.href);
  }

  function handleInputKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const entry = filtered[activeIndex];
      if (entry) navigate(entry);
    }
  }

  if (!open) return null;

  return (
    <div
      className="command-palette__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="命令面板"
      onClick={() => setOpen(false)}
    >
      <div className="command-palette" onClick={(event) => event.stopPropagation()}>
        <div className="command-palette__input-wrap">
          <span className="command-palette__icon" aria-hidden="true">
            ⌘
          </span>
          <input
            ref={inputRef}
            className="command-palette__input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKey}
            placeholder="搜索页面、功能入口…"
            aria-label="搜索"
          />
          <kbd className="command-palette__kbd">Esc</kbd>
        </div>
        <div className="command-palette__list" role="listbox">
          {filtered.length === 0 ? (
            <div className="command-palette__empty">未找到匹配项</div>
          ) : (
            filtered.map((entry, index) => (
              <button
                key={entry.id ?? entry.href}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className="command-palette__item"
                data-active={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => navigate(entry)}
              >
                <div className="command-palette__item-main">
                  <span className="command-palette__item-label">{entry.label}</span>
                  {entry.description ? (
                    <span className="command-palette__item-desc">{entry.description}</span>
                  ) : null}
                </div>
                <span className="command-palette__item-group">{entry.group}</span>
              </button>
            ))
          )}
        </div>
        <div className="command-palette__footer">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> 选择
          </span>
          <span>
            <kbd>Enter</kbd> 跳转
          </span>
          <span>
            <kbd>⌘K</kbd> 呼出 / 关闭
          </span>
        </div>
      </div>
    </div>
  );
}
