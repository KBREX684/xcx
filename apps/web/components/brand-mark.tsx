import type { ReactNode } from "react";

export const BRAND_NAME_CN = "蜂聚合";
export const BRAND_NAME_EN = "SwarmHive";

type BrandLockupProps = {
  className?: string;
  labelCn?: string;
  labelEn?: string;
  mark?: ReactNode;
  showEnglish?: boolean;
  size?: "sidebar" | "hero" | "compact";
};

type SwarmHiveIconProps = {
  className?: string;
  decorative?: boolean;
};

export function SwarmHiveIcon({ className, decorative = false }: SwarmHiveIconProps) {
  return (
    <svg
      className={className ? `brand-mark ${className}` : "brand-mark"}
      viewBox="0 0 64 64"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "蜂聚合图标"}
      focusable="false"
    >
      <path className="brand-mark__tile" d="M32 4 56.2 18v28L32 60 7.8 46V18Z" />
      <g className="brand-mark__flow" fill="none" strokeLinecap="round">
        <path
          className="brand-mark__flow-line brand-mark__flow-line--short"
          d="M19.8 34.8 33.2 21.4"
        />
        <path
          className="brand-mark__flow-line brand-mark__flow-line--main"
          d="M22.8 45.2 45.2 22.8"
        />
        <path
          className="brand-mark__flow-line brand-mark__flow-line--long"
          d="M33.2 48.8 47.4 34.6"
        />
      </g>
    </svg>
  );
}

export function BrandLockup({
  className,
  labelCn = BRAND_NAME_CN,
  labelEn = BRAND_NAME_EN,
  mark,
  showEnglish = true,
  size = "sidebar",
}: BrandLockupProps) {
  const classes = ["brand-lockup", `brand-lockup--${size}`, className].filter(Boolean).join(" ");

  return (
    <span className={classes}>
      {mark ?? <SwarmHiveIcon decorative />}
      <span className="brand-lockup__copy">
        <span className="brand-lockup__cn">{labelCn}</span>
        {showEnglish && labelEn ? (
          <span className="brand-lockup__en-row">
            <span className="brand-lockup__en">{labelEn}</span>
          </span>
        ) : null}
      </span>
    </span>
  );
}
