/**
 * RBAC v2 permission model for ACP.
 *
 * Replaces the flat admin/manager/member hierarchy with fine-grained
 * action + scope permissions. Each permission is a (action, scope) pair
 * where scope can be workspace, team, or project level.
 *
 * During shadow mode (C2), both the old RolesGuard and the new
 * RbacV2Guard run in parallel. Mismatches produce warnings. After 30
 * days without warnings, the old guard is removed.
 */

// ─── Permission Actions ───────────────────────────────────────────────────────

export type PermAction =
  | "workspace:read"
  | "workspace:update"
  | "workspace:delete"
  | "workspace:manage_members"
  | "workspace:manage_agents"
  | "workspace:manage_webhooks"
  | "workspace:grant_capability"
  | "workspace:rotate_key"
  | "workspace:view_audit"
  | "project:read"
  | "project:create"
  | "project:update"
  | "project:delete"
  | "project:issue_certificate"
  | "project:revoke_certificate"
  | "project:manage_runs"
  | "team:read"
  | "team:create"
  | "team:update"
  | "team:delete"
  | "team:manage_bindings"
  | "agent:read"
  | "agent:create"
  | "agent:update"
  | "agent:delete"
  | "agent:grant_capability"
  | "agent:revoke_capability"
  | "task:read"
  | "task:create"
  | "task:update"
  | "task:delete"
  | "task:delegate"
  | "run:execute"
  | "run:approve"
  | "run:reject"
  | "workflow:read"
  | "workflow:create"
  | "workflow:update"
  | "workflow:delete"
  | "certificate:read"
  | "certificate:verify"
  | "settings:read"
  | "settings:update"
  | "innovation:read"
  | "innovation:update";

export type PermScope = "workspace" | "team" | "project";

// ─── Role → Permission Mapping ────────────────────────────────────────────────

/**
 * Default permission sets per role at each scope level.
 * Custom roles can be added via RoleAssignment rows in the database.
 */
const ROLE_PERMISSIONS: Record<string, PermAction[]> = {
  admin: [
    "workspace:read",
    "workspace:update",
    "workspace:delete",
    "workspace:manage_members",
    "workspace:manage_agents",
    "workspace:manage_webhooks",
    "workspace:grant_capability",
    "workspace:rotate_key",
    "workspace:view_audit",
    "project:read",
    "project:create",
    "project:update",
    "project:delete",
    "project:issue_certificate",
    "project:revoke_certificate",
    "project:manage_runs",
    "team:read",
    "team:create",
    "team:update",
    "team:delete",
    "team:manage_bindings",
    "agent:read",
    "agent:create",
    "agent:update",
    "agent:delete",
    "agent:grant_capability",
    "agent:revoke_capability",
    "task:read",
    "task:create",
    "task:update",
    "task:delete",
    "task:delegate",
    "run:execute",
    "run:approve",
    "run:reject",
    "workflow:read",
    "workflow:create",
    "workflow:update",
    "workflow:delete",
    "certificate:read",
    "certificate:verify",
    "settings:read",
    "settings:update",
    "innovation:read",
    "innovation:update",
  ],
  manager: [
    "workspace:read",
    "workspace:manage_members",
    "workspace:manage_agents",
    "workspace:manage_webhooks",
    "workspace:view_audit",
    "project:read",
    "project:create",
    "project:update",
    "project:issue_certificate",
    "project:manage_runs",
    "team:read",
    "team:create",
    "team:update",
    "team:manage_bindings",
    "agent:read",
    "agent:create",
    "agent:update",
    "task:read",
    "task:create",
    "task:update",
    "task:delete",
    "task:delegate",
    "run:execute",
    "run:approve",
    "run:reject",
    "workflow:read",
    "workflow:create",
    "workflow:update",
    "certificate:read",
    "certificate:verify",
    "settings:read",
    "innovation:read",
    "innovation:update",
  ],
  member: [
    "workspace:read",
    "project:read",
    "team:read",
    "agent:read",
    "task:read",
    "task:create",
    "task:update",
    "run:execute",
    "workflow:read",
    "certificate:read",
    "certificate:verify",
    "settings:read",
    "innovation:read",
  ],
};

/**
 * Returns the set of permissions granted to a role.
 * Returns empty set for unknown roles.
 */
export function getPermissionsForRole(role: string): Set<PermAction> {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? new Set(permissions) : new Set();
}

/**
 * Check if a role grants a specific permission action.
 */
export function roleHasPermission(role: string, action: PermAction): boolean {
  return getPermissionsForRole(role).has(action);
}
