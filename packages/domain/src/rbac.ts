/**
 * RBAC role hierarchy for ACP.
 *
 * Three tiers, highest first:
 *   - "admin"   — workspace owner; full control (key rotation, capability grants).
 *   - "manager" — can run/approve workflows, edit projects, manage members in
 *                 the workspace; cannot rotate keys or grant capabilities.
 *   - "member"  — default tier; read + create personal tasks/comments.
 *
 * A higher tier always satisfies a lower-tier requirement, so a route guarded
 * with @Roles("manager") will accept admins too.
 */
export type AcpRole = "admin" | "manager" | "member";

const TIER_ORDER: Record<AcpRole, number> = {
  admin: 3,
  manager: 2,
  member: 1,
};

const ALIASES: Record<string, AcpRole> = {
  admin: "admin",
  owner: "admin",
  superadmin: "admin",

  manager: "manager",
  lead: "manager",
  approver: "manager",

  member: "member",
  user: "member",
  viewer: "member",
};

/** Normalise free-form role strings into one of the three canonical tiers. */
export function normaliseRole(value: string | null | undefined): AcpRole {
  if (!value) return "member";
  const trimmed = value.trim().toLowerCase();
  return ALIASES[trimmed] ?? "member";
}

/**
 * Returns true when `actual` (the user's role) satisfies any of the
 * `required` roles, taking hierarchy into account: admin > manager > member.
 *
 * Empty `required` means "no role gate" → always allowed.
 */
export function roleSatisfies(
  actual: string | null | undefined,
  required: readonly string[] | undefined,
): boolean {
  if (!required || required.length === 0) return true;
  const actualTier = TIER_ORDER[normaliseRole(actual)];
  return required.some((req) => actualTier >= TIER_ORDER[normaliseRole(req)]);
}
