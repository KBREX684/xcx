"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Tooltip } from "@agent-control-plane/ui";

export function CopyId({
  value,
  label,
  displayText,
}: {
  value: string;
  label?: string;
  displayText?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement("textarea");
        ta.value = value;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast.success("已复制", { duration: 1500 });
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("复制失败，请手动选择。");
    }
  }

  return (
    <Tooltip content={copied ? "已复制" : value}>
      <button
        type="button"
        onClick={handleCopy}
        className="copy-id"
        aria-label={label ? `复制 ${label}：${value}` : `复制 ${value}`}
      >
        <span className="copy-id__text">{displayText ?? value}</span>
        <span className="copy-id__icon" aria-hidden="true">
          {copied ? "✓" : "⎘"}
        </span>
      </button>
    </Tooltip>
  );
}
