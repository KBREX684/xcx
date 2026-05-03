"use client";

/**
 * Shared loading skeleton used by route-level `loading.tsx` files.
 *
 * Renders a structural skeleton mirroring the typical workspace layout
 * (header + filters + list rows + inspector) so route transitions feel
 * stable instead of flashing a blank page.
 */
export function RouteLoading({ label = "加载中…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className="route-skeleton">
      <div className="route-skeleton-header">
        <div className="skeleton-line skeleton-line-eyebrow" />
        <div className="skeleton-line skeleton-line-title" />
        <div className="skeleton-line skeleton-line-meta" />
      </div>

      <div className="route-skeleton-grid">
        <div className="route-skeleton-main">
          <div className="route-skeleton-toolbar">
            <span className="skeleton-chip" />
            <span className="skeleton-chip" />
            <span className="skeleton-chip" />
          </div>
          <div className="route-skeleton-list">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="route-skeleton-row">
                <span className="skeleton-line skeleton-line-row" />
                <span className="skeleton-line skeleton-line-row-narrow" />
              </div>
            ))}
          </div>
        </div>
        <aside className="route-skeleton-aside">
          <div className="skeleton-block" />
          <div className="skeleton-block skeleton-block-tall" />
        </aside>
      </div>

      <span className="visually-hidden">{label}</span>
    </div>
  );
}
