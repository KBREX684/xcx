import { describe, it, expect } from "vitest";
import { normaliseRole, roleSatisfies } from "./rbac";

describe("normaliseRole", () => {
  it("maps canonical names directly", () => {
    expect(normaliseRole("admin")).toBe("admin");
    expect(normaliseRole("manager")).toBe("manager");
    expect(normaliseRole("member")).toBe("member");
  });

  it("normalises case and whitespace", () => {
    expect(normaliseRole("  ADMIN  ")).toBe("admin");
    expect(normaliseRole("Manager")).toBe("manager");
  });

  it("maps known aliases", () => {
    expect(normaliseRole("owner")).toBe("admin");
    expect(normaliseRole("superadmin")).toBe("admin");
    expect(normaliseRole("lead")).toBe("manager");
    expect(normaliseRole("approver")).toBe("manager");
    expect(normaliseRole("user")).toBe("member");
    expect(normaliseRole("viewer")).toBe("member");
  });

  it("falls back to 'member' for unknown / empty input", () => {
    expect(normaliseRole(null)).toBe("member");
    expect(normaliseRole(undefined)).toBe("member");
    expect(normaliseRole("")).toBe("member");
    expect(normaliseRole("guest")).toBe("member");
  });
});

describe("roleSatisfies — hierarchy admin > manager > member", () => {
  it("returns true when no required roles are specified", () => {
    expect(roleSatisfies("member", undefined)).toBe(true);
    expect(roleSatisfies("member", [])).toBe(true);
  });

  it("admin satisfies admin / manager / member", () => {
    expect(roleSatisfies("admin", ["admin"])).toBe(true);
    expect(roleSatisfies("admin", ["manager"])).toBe(true);
    expect(roleSatisfies("admin", ["member"])).toBe(true);
  });

  it("manager satisfies manager / member but NOT admin", () => {
    expect(roleSatisfies("manager", ["manager"])).toBe(true);
    expect(roleSatisfies("manager", ["member"])).toBe(true);
    expect(roleSatisfies("manager", ["admin"])).toBe(false);
  });

  it("member satisfies only member", () => {
    expect(roleSatisfies("member", ["member"])).toBe(true);
    expect(roleSatisfies("member", ["manager"])).toBe(false);
    expect(roleSatisfies("member", ["admin"])).toBe(false);
  });

  it("supports multi-role requirement (any-of)", () => {
    expect(roleSatisfies("manager", ["admin", "manager"])).toBe(true);
    expect(roleSatisfies("member", ["admin", "manager"])).toBe(false);
  });

  it("falls back to 'member' for null / unknown actual role", () => {
    expect(roleSatisfies(null, ["member"])).toBe(true);
    expect(roleSatisfies(null, ["manager"])).toBe(false);
    expect(roleSatisfies("unknown_role", ["member"])).toBe(true);
  });

  it("respects aliases on both sides of the comparison", () => {
    expect(roleSatisfies("owner", ["manager"])).toBe(true);
    expect(roleSatisfies("lead", ["member"])).toBe(true);
    expect(roleSatisfies("viewer", ["lead"])).toBe(false);
  });
});
