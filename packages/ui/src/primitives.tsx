/**
 * Layout & feedback primitives shared between apps/web pages.
 *
 * Goals (Iteration 5 / Cycle 5-A T10):
 *   - Replace ad-hoc `<div style={{display:"flex",gap:...}}>` jungles with
 *     a small, well-named vocabulary (Stack/Inline/Grid/Shell/SplitPane).
 *   - Centralise the four feedback states (loading / empty / error / success)
 *     so every route renders them with the same Chinese copy and tone.
 *
 * All primitives are **className-driven**, picking up CSS custom properties
 * declared in `./tokens.css`. They never own colour/typography directly so
 * theming stays a single-file concern.
 */
import type { CSSProperties, ReactNode } from "react";

type Spacing = "xs" | "sm" | "md" | "lg" | "xl";

interface BaseLayoutProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Vertical flex container with a single gap token. */
export function Stack({
  gap = "md",
  align,
  children,
  className,
  style,
}: BaseLayoutProps & { gap?: Spacing; align?: "start" | "center" | "end" | "stretch" }) {
  return (
    <div
      className={["acp-stack", className].filter(Boolean).join(" ")}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `var(--acp-space-${gap})`,
        alignItems: align,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Horizontal flex container with wrap-by-default. */
export function Inline({
  gap = "sm",
  align = "center",
  justify,
  wrap = true,
  children,
  className,
  style,
}: BaseLayoutProps & {
  gap?: Spacing;
  align?: "start" | "center" | "end" | "baseline";
  justify?: "start" | "center" | "end" | "between" | "around";
  wrap?: boolean;
}) {
  const justifyMap: Record<string, string> = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    between: "space-between",
    around: "space-around",
  };
  return (
    <div
      className={["acp-inline", className].filter(Boolean).join(" ")}
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: wrap ? "wrap" : "nowrap",
        gap: `var(--acp-space-${gap})`,
        alignItems: align,
        justifyContent: justify ? justifyMap[justify] : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** CSS Grid with auto-fit columns; `min` is the minimum column width. */
export function Grid({
  min = "16rem",
  gap = "md",
  children,
  className,
  style,
}: BaseLayoutProps & { min?: string; gap?: Spacing }) {
  return (
    <div
      className={["acp-grid", className].filter(Boolean).join(" ")}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(${min}, 1fr))`,
        gap: `var(--acp-space-${gap})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Page shell — provides max-width, horizontal padding, and vertical rhythm. */
export function Shell({
  children,
  maxWidth = "var(--acp-shell-max)",
  className,
  style,
}: BaseLayoutProps & { maxWidth?: string }) {
  return (
    <div
      className={["acp-shell", className].filter(Boolean).join(" ")}
      style={{
        width: "100%",
        maxWidth,
        marginInline: "auto",
        paddingInline: "var(--acp-space-lg)",
        paddingBlock: "var(--acp-space-xl)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Two-column split where one side is fixed-width and the other is fluid. */
export function SplitPane({
  primary,
  secondary,
  side = "right",
  width = "20rem",
  gap = "lg",
}: {
  primary: ReactNode;
  secondary: ReactNode;
  side?: "left" | "right";
  width?: string;
  gap?: Spacing;
}) {
  const cols = side === "right" ? `1fr ${width}` : `${width} 1fr`;
  const order = side === "right" ? [primary, secondary] : [secondary, primary];
  return (
    <div
      className="acp-split"
      style={{
        display: "grid",
        gridTemplateColumns: cols,
        gap: `var(--acp-space-${gap})`,
      }}
    >
      <div>{order[0]}</div>
      <div>{order[1]}</div>
    </div>
  );
}

/**
 * Empty state — used when a list/page has no rows yet. Use `action` for the
 * primary call-to-action ("新建项目" etc.).
 *
 * Note: this is the new layout-aware variant; the legacy `EmptyState` in
 * components.tsx is kept for backward compatibility and will be removed
 * after Cycle 5-B once all call-sites migrate.
 */
export function EmptyStateBlock({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="acp-empty" role="status" aria-live="polite">
      {icon ? (
        <div className="acp-empty__icon" aria-hidden>
          {icon}
        </div>
      ) : null}
      <h3 className="acp-empty__title">{title}</h3>
      {description ? <p className="acp-empty__desc">{description}</p> : null}
      {action ? <div className="acp-empty__action">{action}</div> : null}
    </div>
  );
}

/**
 * Inline error banner. Use this in `error.tsx` boundaries and after failed
 * server actions. `tone="warning"` softens the visual for non-blocking issues.
 */
export function ErrorBanner({
  title,
  message,
  tone = "error",
  action,
}: {
  title: string;
  message?: ReactNode;
  tone?: "error" | "warning";
  action?: ReactNode;
}) {
  return (
    <div className="acp-banner" data-tone={tone} role="alert">
      <div className="acp-banner__body">
        <strong className="acp-banner__title">{title}</strong>
        {message ? <span className="acp-banner__msg">{message}</span> : null}
      </div>
      {action ? <div className="acp-banner__action">{action}</div> : null}
    </div>
  );
}

/**
 * DataList — small key/value pairs typically used in detail panels.
 * Renders as a `<dl>` for screen-reader semantics.
 */
export function DataList({
  items,
  layout = "rows",
}: {
  items: Array<{ label: ReactNode; value: ReactNode; hint?: ReactNode }>;
  layout?: "rows" | "columns";
}) {
  return (
    <dl className="acp-datalist" data-layout={layout}>
      {items.map((item, idx) => (
        <div className="acp-datalist__row" key={idx}>
          <dt className="acp-datalist__label">{item.label}</dt>
          <dd className="acp-datalist__value">
            {item.value}
            {item.hint ? <span className="acp-datalist__hint"> {item.hint}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
