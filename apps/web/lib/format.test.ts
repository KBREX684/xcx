import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  shortTrace,
  formatJsonBlock,
  formatPercent,
  formatCurrencyCents,
  getProjectHealthLabel,
  getPriorityLabel,
  getWorkflowStatusLabel,
} from "./format";

describe("format helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-26T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 暂无 for empty datetime input", () => {
    expect(formatDateTime(null)).toBe("暂无");
    expect(formatDateTime(undefined)).toBe("暂无");
    expect(formatDateTime("")).toBe("暂无");
    expect(formatDate(null)).toBe("暂无");
  });

  it("returns 暂无 for invalid datetime input", () => {
    expect(formatDateTime("not-a-date")).toBe("暂无");
  });

  it("formats valid datetime via Intl zh-CN", () => {
    const out = formatDate("2026-04-26T12:00:00.000Z");
    // Intl output may vary by ICU but should contain 2026 and the day number.
    expect(out).toMatch(/2026/);
  });

  it("formats relative time across granularities", () => {
    expect(formatRelativeTime(null)).toBe("刚刚");
    expect(formatRelativeTime("invalid")).toBe("刚刚");
    // 30 seconds ago
    expect(formatRelativeTime(new Date(Date.now() - 30_000).toISOString())).toMatch(/秒/);
    // 5 minutes ago
    expect(formatRelativeTime(new Date(Date.now() - 5 * 60_000).toISOString())).toMatch(/分钟/);
    // 3 hours ago
    expect(formatRelativeTime(new Date(Date.now() - 3 * 3600_000).toISOString())).toMatch(/小时/);
    // 7 days ago
    expect(formatRelativeTime(new Date(Date.now() - 7 * 86400_000).toISOString())).toMatch(/天/);
    // > 30 days falls back to date
    expect(formatRelativeTime(new Date(Date.now() - 60 * 86400_000).toISOString())).toMatch(/2026/);
  });

  it("shortTrace truncates with default and custom length", () => {
    expect(shortTrace(null)).toBe("暂无");
    expect(shortTrace("abcdef0123456789")).toBe("abcdef01");
    expect(shortTrace("abcdef0123456789", 4)).toBe("abcd");
  });

  it("formatJsonBlock pretty-prints valid JSON and falls back gracefully", () => {
    expect(formatJsonBlock(null)).toBe("暂无结构化内容。");
    expect(formatJsonBlock("")).toBe("暂无结构化内容。");
    expect(formatJsonBlock('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(formatJsonBlock("not json")).toBe("not json");
  });

  it("formatPercent rounds and handles null", () => {
    expect(formatPercent(null)).toBe("暂无");
    expect(formatPercent(0.123)).toBe("12%");
    expect(formatPercent(1)).toBe("100%");
  });

  it("formatCurrencyCents converts cents to CNY", () => {
    expect(formatCurrencyCents(null)).toBe("暂无");
    const out = formatCurrencyCents(12345);
    expect(out).toContain("123.45");
  });

  it("label helpers return mapped values or fallback", () => {
    expect(getProjectHealthLabel(null)).toBe("暂无");
    expect(getProjectHealthLabel("unknown_health_value")).toBe("unknown_health_value");
    expect(getPriorityLabel(null)).toBe("暂无");
    expect(getWorkflowStatusLabel("unknown_status")).toBe("unknown_status");
  });
});
