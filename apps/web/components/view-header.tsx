import Link from "next/link";
import type { ReactNode } from "react";

type ViewHeaderTab = {
  key?: string;
  label: string;
  href: string;
  active?: boolean;
};

export function ViewHeader({
  eyebrow,
  title,
  description,
  tabs,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  tabs?: ViewHeaderTab[];
  actions?: ReactNode;
}) {
  return (
    <header className="view-header">
      <div className="view-header-main">
        {eyebrow ? <p className="view-eyebrow">{eyebrow}</p> : null}
        <h2 className="view-title">{title}</h2>
        {description ? <p className="view-description">{description}</p> : null}
      </div>
      {tabs?.length ? (
        <nav className="view-tabs" aria-label={`${title} views`}>
          {tabs.map((tab) => (
            <Link
              key={tab.key ?? `${tab.label}:${tab.href}`}
              href={tab.href}
              className="view-tab"
              data-active={tab.active ? "true" : "false"}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      ) : null}
      {actions ? <div className="view-actions">{actions}</div> : null}
    </header>
  );
}
