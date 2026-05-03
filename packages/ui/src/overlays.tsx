"use client";

/**
 * Interactive overlay primitives — Modal / Dropdown / Tooltip.
 *
 * Iteration 6 / P1: replaces ad-hoc `<details>` and native `title` usages
 * with accessible, keyboard-friendly building blocks. Companion CSS lives in
 * `./tokens.css` (`.acp-modal`, `.acp-dropdown`, `.acp-tooltip`).
 *
 * Behaviour:
 *   - Modal: focus-trap-light + Esc to close + scroll-lock + role=dialog.
 *   - Dropdown: outside-click + Esc + roving focus on items.
 *   - Tooltip: hover/focus open + 300ms delay + role=tooltip + reduced-motion safe.
 *
 * All primitives are uncontrolled by default (open via internal state) but
 * also accept controlled `open`/`onOpenChange` for parent orchestration.
 */
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

/* ===================== Modal ===================== */

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Optional aria-label when no `title` is provided. */
  ariaLabel?: string;
  /** Container max-width. Defaults to `min(560px, calc(100vw - 32px))`. */
  width?: number | string;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  ariaLabel,
  width,
  className,
}: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastActiveRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    lastActiveRef.current = document.activeElement;
    const root = dialogRef.current;
    // Focus the first focusable element inside the dialog.
    const focusable = root?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (lastActiveRef.current instanceof HTMLElement) {
        lastActiveRef.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  const dialogStyle: CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width ?? "min(560px, calc(100vw - 32px))",
  };

  return (
    <div className="acp-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ? undefined : ariaLabel}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        className={["acp-modal", className].filter(Boolean).join(" ")}
        style={dialogStyle}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {title ? (
          <header className="acp-modal__head">
            <h2 id={titleId} className="acp-modal__title">
              {title}
            </h2>
            <button
              type="button"
              className="acp-modal__close"
              aria-label="关闭"
              onClick={onClose}
            >
              ×
            </button>
          </header>
        ) : null}
        {description ? (
          <p id={descId} className="acp-modal__desc">
            {description}
          </p>
        ) : null}
        <div className="acp-modal__body">{children}</div>
        {footer ? <footer className="acp-modal__foot">{footer}</footer> : null}
      </div>
    </div>
  );
}

/* ===================== Dropdown ===================== */

export interface DropdownItem {
  key: string;
  label: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  href?: string;
}

export interface DropdownProps {
  /** Trigger element. The Dropdown attaches click/keyboard handlers via cloneElement. */
  trigger: ReactElement;
  items: DropdownItem[];
  align?: "start" | "end";
  ariaLabel?: string;
  className?: string;
}

export function Dropdown({
  trigger,
  items,
  align = "start",
  ariaLabel = "操作菜单",
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onDocPointer(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      if (!containerRef.current?.contains(event.target)) close();
    }
    function onDocKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("pointerdown", onDocPointer);
    document.addEventListener("keydown", onDocKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer);
      document.removeEventListener("keydown", onDocKey);
    };
  }, [open, close]);

  function handleTriggerClick(event: MouseEvent) {
    event.preventDefault();
    setOpen((prev) => !prev);
    setActiveIndex(0);
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((idx) => Math.min(items.length - 1, idx + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((idx) => Math.max(0, idx - 1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const item = items[activeIndex];
      if (item && !item.disabled) {
        item.onSelect?.();
        close();
      }
    }
  }

  const triggerProps: Record<string, unknown> = {
    onClick: handleTriggerClick,
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": open ? menuId : undefined,
  };
  const enhancedTrigger = isValidElement(trigger)
    ? cloneElement(trigger, triggerProps)
    : trigger;

  return (
    <div
      ref={containerRef}
      className={["acp-dropdown", `acp-dropdown--${align}`, className].filter(Boolean).join(" ")}
    >
      {enhancedTrigger}
      {open ? (
        <ul
          id={menuId}
          role="menu"
          aria-label={ariaLabel}
          className="acp-dropdown__menu"
          onKeyDown={handleMenuKeyDown}
          tabIndex={-1}
        >
          {items.map((item, idx) => {
            const className = [
              "acp-dropdown__item",
              item.disabled ? "acp-dropdown__item--disabled" : null,
              item.destructive ? "acp-dropdown__item--destructive" : null,
              idx === activeIndex ? "acp-dropdown__item--active" : null,
            ]
              .filter(Boolean)
              .join(" ");
            const handleSelect = () => {
              if (item.disabled) return;
              item.onSelect?.();
              close();
            };
            return (
              <li key={item.key} role="none">
                {item.href ? (
                  <a
                    href={item.href}
                    role="menuitem"
                    className={className}
                    aria-disabled={item.disabled}
                    onClick={(event) => {
                      if (item.disabled) {
                        event.preventDefault();
                        return;
                      }
                      close();
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    {item.label}
                  </a>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className={className}
                    disabled={item.disabled}
                    onClick={handleSelect}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    {item.label}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/* ===================== Tooltip ===================== */

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  /** Show delay in ms (default 300). */
  delay?: number;
  side?: "top" | "bottom";
  className?: string;
}

export function Tooltip({ content, children, delay = 300, side = "top", className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const show = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  if (!isValidElement(children)) return children;
  type TriggerProps = {
    onMouseEnter?: (event: MouseEvent) => void;
    onMouseLeave?: (event: MouseEvent) => void;
    onFocus?: (event: unknown) => void;
    onBlur?: (event: unknown) => void;
    "aria-describedby"?: string;
  };
  const childProps = (children.props ?? {}) as TriggerProps;
  const enhanced = cloneElement(children, {
    onMouseEnter: (event: MouseEvent) => {
      childProps.onMouseEnter?.(event);
      show();
    },
    onMouseLeave: (event: MouseEvent) => {
      childProps.onMouseLeave?.(event);
      hide();
    },
    onFocus: (event: unknown) => {
      childProps.onFocus?.(event);
      show();
    },
    onBlur: (event: unknown) => {
      childProps.onBlur?.(event);
      hide();
    },
    "aria-describedby": visible ? tooltipId : childProps["aria-describedby"],
  } as TriggerProps);

  return (
    <span className={["acp-tooltip-wrap", className].filter(Boolean).join(" ")}>
      {enhanced}
      {visible ? (
        <span
          id={tooltipId}
          role="tooltip"
          className={["acp-tooltip", `acp-tooltip--${side}`].join(" ")}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
