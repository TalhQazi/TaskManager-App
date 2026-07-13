export const ROLES = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  MANAGER: "manager",
  EMPLOYEE: "employee",
  DEVELOPER: "developer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Role groups for access control
export const ROLE_GROUPS = {
  // Full system access
  ALL_ADMIN: [ROLES.SUPER_ADMIN, ROLES.ADMIN] as readonly Role[],
  
  // Admin + management tier
  MANAGEMENT: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER] as readonly Role[],
  
  // Roles allowed to use Dropbox integration
  DROPBOX_ALLOWED: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER] as readonly Role[],
  
  // All authenticated roles
  ALL: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.DEVELOPER] as readonly Role[],
} as const;

/** Convenience check: is the given role in the allowed list? */
export function hasRole(currentRole: string, allowedRoles: readonly string[]): boolean {
  return allowedRoles.includes(currentRole);
}