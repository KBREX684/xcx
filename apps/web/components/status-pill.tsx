import { statusLabels, type ProjectStatus, type RunStatus, type TaskStatus } from "@agent-control-plane/domain";
import { statusToneMap } from "@agent-control-plane/ui";

export function StatusPill({ status }: { status: ProjectStatus | TaskStatus | RunStatus }) {
  const tone =
    statusToneMap[status as keyof typeof statusToneMap] ?? {
      background: "rgba(23, 23, 20, 0.08)",
      foreground: "#171714"
    };

  return (
    <span
      className="status-pill"
      style={{
        background: tone.background,
        color: tone.foreground
      }}
    >
      {statusLabels[status]}
    </span>
  );
}

