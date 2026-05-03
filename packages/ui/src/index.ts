export const controlPlaneTypography = {
  display: "'Fraunces', 'Source Han Serif SC', 'Noto Serif SC', Georgia, serif",
  body: "'IBM Plex Sans', 'HarmonyOS Sans SC', 'PingFang SC', 'Source Han Sans SC', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'IBM Plex Mono', 'SFMono-Regular', 'Cascadia Mono', Consolas, monospace",
} as const;

export const controlPlaneThemeMeta = {
  appName: "Agent 指挥台",
  workspaceName: "Studio Zero",
} as const;

export { DataTable, EmptyState, SectionCard, StatusPill } from "./components";

// Iteration 5 / Cycle 5-A — layout & feedback primitives. Companion CSS
// lives in `./tokens.css`; consumers should `import "@agent-control-plane/ui/tokens.css"`
// once at app entry (e.g. apps/web/app/layout.tsx).
export {
  Stack,
  Inline,
  Grid,
  Shell,
  SplitPane,
  EmptyStateBlock,
  ErrorBanner,
  DataList,
} from "./primitives";

// Iteration 6 / P1 — overlay primitives (Modal / Dropdown / Tooltip).
// These are client components; do not import them from server components.
export { Modal, Dropdown, Tooltip } from "./overlays";
export type { ModalProps, DropdownItem, DropdownProps, TooltipProps } from "./overlays";
