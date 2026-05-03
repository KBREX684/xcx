/**
 * 移动端图标集（react-native-svg 实现，与 apps/web/components/icons.tsx 保持视觉一致）。
 *
 * 设计规范：
 *   - viewBox 24×24，strokeWidth 1.8，stroke linecap/linejoin "round"
 *   - 默认填色 none，描边走 currentColor 风（这里通过 color prop 传入）
 *   - 与小程序 UI 组件参考图保持线性、克制的轮廓风
 */
import * as React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { palette } from "../tokens";

export interface IconProps {
  size?: number;
  color?: string;
  /** 描边粗细。默认 1.8。 */
  strokeWidth?: number;
  /** 是否对屏幕阅读器隐藏。默认 true（图标多数装饰性）。 */
  decorative?: boolean;
  /** a11y 标签，decorative=false 时生效。 */
  label?: string;
}

interface IconBaseProps extends IconProps {
  children: React.ReactNode;
}

function IconBase({
  size = 22,
  color = palette.textSecondary,
  strokeWidth = 1.8,
  decorative = true,
  label,
  children,
}: IconBaseProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : label}
    >
      {children}
    </Svg>
  );
}

export function HomeIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Path d="M4 11.5 12 5l8 6.5" />
      <Path d="M6.5 10.5V19h11v-8.5" />
      <Path d="M10 19v-4.5h4V19" />
    </IconBase>
  );
}

export function FolderIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Path d="M3.5 7.5h5l1.8 2h8.7a1.5 1.5 0 0 1 1.5 1.5V17a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2Z" />
    </IconBase>
  );
}

export function WorkflowIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Circle cx="6.5" cy="5.5" r="2.25" />
      <Circle cx="17.5" cy="5.5" r="2.25" />
      <Circle cx="12" cy="18" r="2.25" />
      <Path d="M8.5 7.25 10.75 15" />
      <Path d="M15.5 7.25 13.25 15" />
      <Path d="M8.75 5.5h6.5" />
    </IconBase>
  );
}

export function ShieldIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.9-7 9-4.1-1.1-7-4.8-7-9V6l7-2.5Z" />
      <Path d="m9.5 11.75 1.75 1.75 3.25-3.5" />
    </IconBase>
  );
}

export function BotIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Rect x="5" y="7.5" width="14" height="10" rx="3.5" />
      <Path d="M12 4v3.5" />
      <Circle cx="9.25" cy="12.5" r="1" />
      <Circle cx="14.75" cy="12.5" r="1" />
      <Path d="M9 16h6" />
      <Path d="M5 11H3.5" />
      <Path d="M20.5 11H19" />
    </IconBase>
  );
}

export function SettingsIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19 12a7 7 0 0 0-.08-1l2.05-1.6-2-3.46-2.45.74a7.3 7.3 0 0 0-1.72-1L14.5 3h-5l-.3 2.68c-.62.24-1.2.58-1.72 1l-2.45-.74-2 3.46L5.08 11a7 7 0 0 0 0 2l-2.05 1.6 2 3.46 2.45-.74c.52.42 1.1.76 1.72 1L9.5 21h5l.3-2.68c.62-.24 1.2-.58 1.72-1l2.45.74 2-3.46L18.92 13c.05-.33.08-.66.08-1Z" />
    </IconBase>
  );
}

export function BellIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Path d="M7.5 16.5h9l-1.1-1.65A3.8 3.8 0 0 1 14.75 12V10.5a2.75 2.75 0 1 0-5.5 0V12c0 .98-.3 1.93-.86 2.75L7.5 16.5Z" />
      <Path d="M10 18.5a2 2 0 0 0 4 0" />
    </IconBase>
  );
}

export function UserIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Circle cx="12" cy="8" r="3.5" />
      <Path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
    </IconBase>
  );
}

export function MessageIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Path d="M6.5 17.5 4 20V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5Z" />
      <Path d="M8.5 9.25h7" />
      <Path d="M8.5 12.75h4.5" />
    </IconBase>
  );
}

export function SearchIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Circle cx="11" cy="11" r="6" />
      <Path d="m20 20-3.6-3.6" />
    </IconBase>
  );
}

export function ChevronRightIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Path d="m9.5 6.5 5.5 5.5-5.5 5.5" />
    </IconBase>
  );
}

export function ChevronLeftIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Path d="m14.5 6.5-5.5 5.5 5.5 5.5" />
    </IconBase>
  );
}

export function CloseIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Path d="m6 6 12 12" />
      <Path d="m18 6-12 12" />
    </IconBase>
  );
}

export function PlusIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Path d="M12 5v14" />
      <Path d="M5 12h14" />
    </IconBase>
  );
}

export function CheckCircleIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="m8.75 12.25 2.1 2.1 4.4-4.6" />
    </IconBase>
  );
}

export function ClockIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M12 7.5V12l3 1.75" />
    </IconBase>
  );
}

export function CertificateIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Rect x="6" y="4.5" width="12" height="15" rx="2.5" />
      <Path d="M9.5 9h5" />
      <Path d="M9.5 12h5" />
      <Path d="m10 19.5 2-2 2 2" />
    </IconBase>
  );
}

export function CameraIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Path d="M4.5 7.5h3l1.5-2h6l1.5 2h3a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V9a1.5 1.5 0 0 1 1.5-1.5Z" />
      <Circle cx="12" cy="13" r="3.5" />
    </IconBase>
  );
}

export function MicIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Rect x="9.5" y="3.5" width="5" height="11" rx="2.5" />
      <Path d="M6 12a6 6 0 0 0 12 0" />
      <Path d="M12 18v3" />
    </IconBase>
  );
}

export function FilterIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Path d="M4 6h16" />
      <Path d="M7 12h10" />
      <Path d="M10 18h4" />
    </IconBase>
  );
}

export function MoreIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Circle cx="6" cy="12" r="1.4" fill={p.color ?? palette.textSecondary} />
      <Circle cx="12" cy="12" r="1.4" fill={p.color ?? palette.textSecondary} />
      <Circle cx="18" cy="12" r="1.4" fill={p.color ?? palette.textSecondary} />
    </IconBase>
  );
}

export function ListIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <Path d="M8 6h12" />
      <Path d="M8 12h12" />
      <Path d="M8 18h12" />
      <Circle cx="4.5" cy="6" r="0.9" fill={p.color ?? palette.textSecondary} />
      <Circle cx="4.5" cy="12" r="0.9" fill={p.color ?? palette.textSecondary} />
      <Circle cx="4.5" cy="18" r="0.9" fill={p.color ?? palette.textSecondary} />
    </IconBase>
  );
}

export function ApprovalsIcon(p: IconProps) {
  // 文档 + 勾选：审批的常见隐喻，与参考图 List Cells 风格一致。
  return (
    <IconBase {...p}>
      <Path d="M7 4h6.5L18 8.5V19a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 19V5.5A1.5 1.5 0 0 1 7 4Z" />
      <Path d="M13 4v4.5h4.5" />
      <Path d="m9 14 2 2 4-4.5" />
    </IconBase>
  );
}

export function ProjectIcon(p: IconProps) {
  // 网格九宫：参考图 04. Bottom Tab Bars 中部图标，用于"项目集"。
  return (
    <IconBase {...p}>
      <Rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <Rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <Rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <Rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </IconBase>
  );
}

/** 命名导出聚合，便于 type-safe map 调用。 */
export const Icons = {
  Home: HomeIcon,
  Folder: FolderIcon,
  Workflow: WorkflowIcon,
  Shield: ShieldIcon,
  Bot: BotIcon,
  Settings: SettingsIcon,
  Bell: BellIcon,
  User: UserIcon,
  Message: MessageIcon,
  Search: SearchIcon,
  ChevronRight: ChevronRightIcon,
  ChevronLeft: ChevronLeftIcon,
  Close: CloseIcon,
  Plus: PlusIcon,
  CheckCircle: CheckCircleIcon,
  Clock: ClockIcon,
  Certificate: CertificateIcon,
  Camera: CameraIcon,
  Mic: MicIcon,
  Filter: FilterIcon,
  More: MoreIcon,
  List: ListIcon,
  Approvals: ApprovalsIcon,
  Project: ProjectIcon,
} as const;
export type IconName = keyof typeof Icons;
