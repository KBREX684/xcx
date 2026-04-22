import { getStatusLabel } from "@agent-control-plane/domain";

export function StatusPill({ status }: { status: string }) {
  return (
    <span className="status-pill" data-tone={status}>
      {getStatusLabel(status)}
    </span>
  );
}
