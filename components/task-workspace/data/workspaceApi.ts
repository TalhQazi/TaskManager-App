import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";

export interface TaskView {
  id: string;
  _id?: string;
  taskNumber?: number;
  title: string;
  description?: string;
  assignees: string[];
  teamLead?: string;
  status: "pending" | "in-progress" | "completed" | "overdue";
  priority: "low" | "medium" | "high";
  category?: string;
  dueDate?: string | null;
  projectId?: string | null;
  projectName?: string;
  executionPriority?: number | null;
  startedAt?: string | null;
  firstStartedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  attachments?: any[];
  subtasks?: Array<{ id: string; title: string; completed: boolean }>;
}

export interface TaskFilters {
  search?: string;
  status?: string;
  priority?: string;
  assignment?: string;
  projectId?: string;
  dueFrom?: string;
  dueTo?: string;
  sort?: string;
}

export interface TasksPage {
  items: TaskView[];
  page: number;
  totalPages: number;
  total: number;
}

export interface WorkloadRow {
  assignee: string;
  active: number;
  highPriority: number;
  overdue: number;
  estimatedHours: number;
  weeklyHours: number | null;
  utilizationPct: number | null;
  avatarUrl?: string;
}

export interface TaskSummary {
  total: number;
  overdue: number;
  completedThisWeek: number;
  onTimePct: number;
  completionPct: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  throughput: Array<{ date: string; count: number }>;
}

export interface TaskDependency {
  _id: string;
  predecessorId: string;
  successorId: string;
  type: string;
  lagDays: number;
}

export const STATUS_COLUMNS: Array<{ key: TaskView["status"]; label: string; color: string; bg: string }> = [
  { key: "pending", label: "Pending", color: "#64748B", bg: "rgba(100, 116, 139, 0.12)" },
  { key: "in-progress", label: "In Progress", color: "#2563EB", bg: "rgba(37, 99, 235, 0.12)" },
  { key: "overdue", label: "Overdue", color: "#EF4444", bg: "rgba(239, 68, 68, 0.12)" },
  { key: "completed", label: "Completed", color: "#10B981", bg: "rgba(16, 185, 129, 0.12)" },
];

export const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: "High", color: "#EF4444", bg: "rgba(239, 68, 68, 0.12)" },
  medium: { label: "Medium", color: "#D97706", bg: "rgba(217, 119, 6, 0.12)" },
  low: { label: "Low", color: "#64748B", bg: "rgba(100, 116, 139, 0.12)" },
};

function normalizeTask(t: any): TaskView {
  return {
    ...t,
    id: String(t.id || t._id || Math.random()),
    _id: String(t._id || t.id || ""),
    title: t.title || "Untitled",
    status: t.status === "completed" || t.status === "in-progress" || t.status === "overdue" ? t.status : "pending",
    priority: t.priority === "high" || t.priority === "medium" || t.priority === "low" ? t.priority : "medium",
    assignees: Array.isArray(t.assignees) ? t.assignees : t.assignee ? [t.assignee] : [],
    attachments: Array.isArray(t.attachments) ? t.attachments : [],
    subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
  };
}

export async function fetchWorkspaceTasksPage(filters: TaskFilters, page: number, limit = 50): Promise<TasksPage> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters.search) params.set("search", filters.search);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.priority && filters.priority !== "all") params.set("priority", filters.priority);
  if (filters.assignment && filters.assignment !== "all") params.set("assignment", filters.assignment);
  if (filters.projectId) params.set("projectId", filters.projectId);
  if (filters.dueFrom) params.set("dueFrom", filters.dueFrom);
  if (filters.dueTo) params.set("dueTo", filters.dueTo);
  if (filters.sort) params.set("sort", filters.sort);

  const res = await apiRequest<any>(`/tasks?${params.toString()}`);
  const raw = res?.data !== undefined ? res.data : res;
  const rawItems = Array.isArray(raw) ? raw : raw?.items || raw?.tasks || [];

  return {
    items: rawItems.map(normalizeTask),
    page,
    totalPages: raw?.totalPages || (rawItems.length >= limit ? page + 1 : page),
    total: raw?.total ?? rawItems.length,
  };
}

export function useWorkspaceTaskDataset(filters: TaskFilters) {
  return useInfiniteQuery({
    queryKey: ["workspace-task-dataset", filters],
    queryFn: ({ pageParam }) => fetchWorkspaceTasksPage(filters, pageParam as number, 50),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    staleTime: 10_000,
  });
}

export function useTaskAnalyticsSummary() {
  return useQuery({
    queryKey: ["task-analytics", "summary"],
    queryFn: async () => {
      try {
        const res = await apiRequest<TaskSummary>("/task-analytics/summary");
        if (res?.data) return res.data;
      } catch (e) {
        console.warn("[workspaceApi] failed /task-analytics/summary", e);
      }
      return null;
    },
    staleTime: 20_000,
  });
}

export function useTaskAnalyticsWorkload() {
  return useQuery({
    queryKey: ["task-analytics", "workload"],
    queryFn: async () => {
      try {
        const res = await apiRequest<any>("/task-analytics/workload");
        const raw: any = res?.data !== undefined ? res.data : res;
        return Array.isArray(raw?.items) ? raw.items : [];
      } catch (e) {
        console.warn("[workspaceApi] failed /task-analytics/workload", e);
        return [];
      }
    },
    staleTime: 20_000,
  });
}

export function useTaskDependencies(taskIds?: string[]) {
  return useQuery({
    queryKey: ["task-dependencies", taskIds?.slice(0, 100)],
    queryFn: async () => {
      try {
        const qs = taskIds?.length ? `?taskIds=${taskIds.join(",")}` : "";
        const res = await apiRequest<any>(`/task-dependencies${qs}`);
        const raw: any = res?.data !== undefined ? res.data : res;
        return Array.isArray(raw?.items) ? raw.items : [];
      } catch (e) {
        console.warn("[workspaceApi] failed /task-dependencies", e);
        return [];
      }
    },
    enabled: !!taskIds && taskIds.length > 0,
    staleTime: 30_000,
  });
}

export function useUpdateWorkspaceTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskView["status"] }) => {
      return await apiRequest(`/tasks/${encodeURIComponent(taskId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-task-dataset"] });
      qc.invalidateQueries({ queryKey: ["task-analytics"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
