import type { ReactNode } from "react";
import { getStatusLabel } from "@agent-control-plane/domain";

export function StatusPill({ status }: { status: string }) {
  return (
    <span className="status-pill" data-tone={status}>
      {getStatusLabel(status)}
    </span>
  );
}
export function SectionCard({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          {eyebrow ? <p className="eyebrow-text">{eyebrow}</p> : null}
          <h3 className="panel-title">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DataTable({ headers, children }: { headers: ReactNode[]; children: ReactNode }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="empty-state-panel" role="status">
      {icon ? (
        <div className="empty-state-panel__icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <p className="empty-state-panel__title">{title}</p>
      {description ? <p className="empty-state-panel__description">{description}</p> : null}
      {actions ? <div className="empty-state-panel__actions">{actions}</div> : null}
    </div>
  );
}
