import type { ReactNode } from "react";

export function InspectorPane({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="inspector-pane">
      <h3 className="inspector-title">{title}</h3>
      {children}
    </aside>
  );
}
