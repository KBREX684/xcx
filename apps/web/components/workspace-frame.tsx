import type { ReactNode } from "react";

export function WorkspaceFrame({ children }: { children: ReactNode }) {
  return <div className="workspace-frame">{children}</div>;
}
