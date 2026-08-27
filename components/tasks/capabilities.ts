import { useAuth } from "@/contexts/AuthContext";

// One capability object, computed from the logged-in user's role, that every shared
// task component reads instead of each portal screen re-deciding "am I allowed to do X"
// in its own copy-pasted way. Mirrors what each of the three legacy screens already
// allowed for its role — this does not change who can do what, just centralizes it.
export interface TaskCapabilities {
  role: "employee" | "manager" | "admin" | "super-admin";
  canCreateTask: boolean;
  canCreateProject: boolean;
  canDeleteTask: boolean;
  canAssign: boolean;
  canReassignInline: boolean;
  canEditPriorityStatus: boolean;
  canManageCost: boolean;
  canManageFollowUps: boolean;
  commentsPersist: boolean;
}

export function capabilitiesForRole(role?: string): TaskCapabilities {
  const normalized = (role || "employee").toLowerCase().trim();
  const isAdmin = normalized === "admin" || normalized === "super-admin";
  const mappedRole: TaskCapabilities["role"] =
    normalized === "super-admin"
      ? "super-admin"
      : normalized === "admin"
      ? "admin"
      : normalized === "manager"
      ? "manager"
      : "employee";

  return {
    role: mappedRole,
    canCreateTask: isAdmin,
    canCreateProject: isAdmin,
    canDeleteTask: isAdmin,
    canAssign: isAdmin,
    canReassignInline: isAdmin,
    canEditPriorityStatus: true,
    canManageCost: !isAdmin,
    canManageFollowUps: !isAdmin,
    commentsPersist: true,
  };
}

export function useTaskCapabilities(): TaskCapabilities {
  const { user } = useAuth();
  return capabilitiesForRole(user?.role);
}
