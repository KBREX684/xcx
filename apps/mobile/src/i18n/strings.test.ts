import { describe, expect, it } from "vitest";
import { setLocale, t, ZH_CN } from "./strings";

describe("i18n strings", () => {
  it("returns zh-CN translation for known keys", () => {
    expect(t("common.retry")).toBe("重试");
    expect(t("home.title")).toBe("今日控制面");
  });

  it("falls back to key for missing entries", () => {
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });

  it("falls back to zh-CN when locale is en-US but entry missing", () => {
    setLocale("en-US");
    expect(t("home.title")).toBe("今日控制面");
    setLocale("zh-CN");
  });

  it("interpolates {name} placeholders without breaking on missing params", () => {
    const dict = ZH_CN as Record<string, string>;
    dict["test.greet"] = "你好 {name}";
    expect(t("test.greet", { name: "Alice" })).toBe("你好 Alice");
    expect(t("test.greet")).toBe("你好 {name}");
  });

  it("does not perform recursive interpolation (防注入)", () => {
    const dict = ZH_CN as Record<string, string>;
    dict["test.evil"] = "{a}";
    expect(t("test.evil", { a: "{b}" })).toBe("{b}");
  });
});
