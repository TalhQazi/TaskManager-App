// Canonical task-domain types shared by the employee, manager, and admin portals.
//
// This is a superset of the three local `Task`/`Project` interfaces that used to be
// hand-duplicated in app/(tabs)/tasks/index.tsx, app/(manager)/tasks/index.tsx, and
// app/(admin)/task-management/index.tsx. Every field any one of those screens relied on
// is kept here; fields a given portal's API doesn't return stay optional so nothing
// breaks when a screen only has a partial payload.

export interface FileObject {
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export type TaskPriority = "urgent" | "high" | "medium" | "low";
export type TaskStatus = "pending" | "in-progress" | "completed" | "overdue";

export interface Task {
  id: string;
  _id?: string;
  taskNumber?: number;
  title: string;
  description: string;
  assignees: string[];
  teamLead?: string;
  priority: TaskPriority;
  status: TaskStatus;
  executionPriority?: number | null;
  dueDate: string;
  dueTime?: string;
  location?: string;
  introVideoUrl?: string;
  createdAt: string;
  projectId?: string | { _id?: string; id?: string };
  projectName?: string;
  attachments?: FileObject[];
  attachment?: FileObject;
  subtasks?: Subtask[];
}

export interface Project {
  id: string;
  _id?: string;
  name: string;
  code?: string;
  description?: string;
  createdAt?: string;
  assignees?: string[];
  teamLead?: string;
  teamMembers?: string[];
  logo?: { url?: string; fileName?: string };
  logoUrl?: string;
  introVideoUrl?: string;
  taskCount?: number;
  status?: "planning" | "active" | "on-hold" | "completed" | string;
  attachments?: FileObject[];
}

export interface TaskComment {
  id: string;
  taskId?: string;
  projectId?: string;
  message: string;
  authorUsername: string;
  createdAt: string;
}

// Grouping used by the Today / Upcoming views. Derived client-side from dueDate/status —
// no schema change on the backend.
export type TaskBucket = "overdue" | "today" | "tomorrow" | "this-week" | "next-week" | "later" | "no-date";

export const PRIORITY_ORDER: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
export const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  completed: "Completed",
  overdue: "Overdue",
};
