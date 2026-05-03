import type { ReactNode } from "react";

export function DataList({
  columns,
  children,
  empty,
}: {
  columns: string[];
  children: ReactNode;
  empty?: ReactNode;
}) {
  return (
    <div className="data-list">
      <div
        className="data-list-head"
        style={{
          gridTemplateColumns: `minmax(260px, 2fr) repeat(${Math.max(columns.length - 1, 1)}, minmax(96px, 1fr))`,
        }}
      >
        {columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      <div className="data-list-body">{children || empty}</div>
    </div>
  );
}

export function DataListRow({ children, href }: { children: ReactNode; href?: string }) {
  const content = <div className="data-list-row">{children}</div>;
  return href ? (
    <a href={href} className="data-list-link">
      {content}
    </a>
  ) : (
    content
  );
}

export function DataListCell({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: "primary" | "muted" | "proof";
}) {
  return (
    <div className="data-list-cell" data-tone={tone ?? "muted"}>
      {children}
    </div>
  );
}
