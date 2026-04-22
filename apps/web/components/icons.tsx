import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6.5 10.5V19h11v-8.5" />
      <path d="M10 19v-4.5h4V19" />
    </IconBase>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 7.5h5l1.8 2h8.7a1.5 1.5 0 0 1 1.5 1.5V17a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2Z" />
    </IconBase>
  );
}

export function WorkflowIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="6.5" cy="5.5" r="2.25" />
      <circle cx="17.5" cy="5.5" r="2.25" />
      <circle cx="12" cy="18" r="2.25" />
      <path d="M8.5 7.25 10.75 15" />
      <path d="M15.5 7.25 13.25 15" />
      <path d="M8.75 5.5h6.5" />
    </IconBase>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.9-7 9-4.1-1.1-7-4.8-7-9V6l7-2.5Z" />
      <path d="m9.5 11.75 1.75 1.75 3.25-3.5" />
    </IconBase>
  );
}

export function BotIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="5" y="7.5" width="14" height="10" rx="3.5" />
      <path d="M12 4v3.5" />
      <circle cx="9.25" cy="12.5" r="1" />
      <circle cx="14.75" cy="12.5" r="1" />
      <path d="M9 16h6" />
      <path d="M5 11H3.5" />
      <path d="M20.5 11H19" />
    </IconBase>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.08-1l2.05-1.6-2-3.46-2.45.74a7.3 7.3 0 0 0-1.72-1L14.5 3h-5l-.3 2.68c-.62.24-1.2.58-1.72 1l-2.45-.74-2 3.46L5.08 11a7 7 0 0 0 0 2l-2.05 1.6 2 3.46 2.45-.74c.52.42 1.1.76 1.72 1L9.5 21h5l.3-2.68c.62-.24 1.2-.58 1.72-1l2.45.74 2-3.46L18.92 13c.05-.33.08-.66.08-1Z" />
    </IconBase>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7.5 16.5h9l-1.1-1.65A3.8 3.8 0 0 1 14.75 12V10.5a2.75 2.75 0 1 0-5.5 0V12c0 .98-.3 1.93-.86 2.75L7.5 16.5Z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </IconBase>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
    </IconBase>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="8.5" r="2.75" />
      <path d="M4.75 18a4.75 4.75 0 0 1 8.5 0" />
      <path d="M15.75 10.25a2.5 2.5 0 1 0 0-3.5" />
      <path d="M17 18a4.15 4.15 0 0 0-2.35-3.75" />
    </IconBase>
  );
}

export function MessageIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6.5 17.5 4 20V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5Z" />
      <path d="M8.5 9.25h7" />
      <path d="M8.5 12.75h4.5" />
    </IconBase>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </IconBase>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6.5 9.5 5.5 5 5.5-5" />
    </IconBase>
  );
}

export function SidebarCollapseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <path d="M9 4.5v15" />
      <path d="m15 9.5-3 3 3 3" />
    </IconBase>
  );
}

export function SidebarExpandIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <path d="M9 4.5v15" />
      <path d="m12 9.5 3 3-3 3" />
    </IconBase>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.25" />
      <path d="M12 19.25v2.25" />
      <path d="m4.98 4.98 1.59 1.59" />
      <path d="m17.43 17.43 1.59 1.59" />
      <path d="M2.5 12h2.25" />
      <path d="M19.25 12h2.25" />
      <path d="m4.98 19.02 1.59-1.59" />
      <path d="m17.43 6.57 1.59-1.59" />
    </IconBase>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M18 14.5A6.5 6.5 0 0 1 9.5 6a7.25 7.25 0 1 0 8.5 8.5Z" />
    </IconBase>
  );
}

export function MonitorIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="4.5" width="17" height="12" rx="2.5" />
      <path d="M8.5 19.5h7" />
      <path d="M12 16.5v3" />
    </IconBase>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.75" />
    </IconBase>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.75 12.25 2.1 2.1 4.4-4.6" />
    </IconBase>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m12 3.5 1.8 4.7 4.7 1.8-4.7 1.8-1.8 4.7-1.8-4.7-4.7-1.8 4.7-1.8L12 3.5Z" />
      <path d="m18.5 14.5.9 2.2 2.1.8-2.1.8-.9 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </IconBase>
  );
}

export function CertificateIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="6" y="4.5" width="12" height="15" rx="2.5" />
      <path d="M9.5 9h5" />
      <path d="M9.5 12h5" />
      <path d="m10 19.5 2-2 2 2" />
    </IconBase>
  );
}
