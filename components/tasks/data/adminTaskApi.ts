import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, addTaskComment, getTaskComments } from "@/lib/admin/apiClient";
import { Task, Project, TaskComment, TaskPriority, TaskStatus } from "../types";

function normalizeTask(t: any): Task {
  const rawId = t?.id || t?._id || String(Math.random());
  return {
    ...t,
    id: String(rawId),
    _id: String(rawId),
    title: t?.title || t?.name || "Untitled Task",
    description: t?.description || "",
    priority: (t?.priority || "medium").toLowerCase() as TaskPriority,
    status: (t?.status || "pending").toLowerCase() as TaskStatus,
    dueDate: t?.dueDate || t?.due_date || t?.deadline || t?.targetDate || "",
    assignees: Array.isArray(t?.assignees) ? t.assignees : t?.assignee ? [t.assignee] : [],
    projectName: t?.projectName || (typeof t?.projectId === "object" ? t?.projectId?.name : undefined),
    createdAt: t?.createdAt || t?.created_at || "",
  };
}

function normalizeProject(p: any): Project {
  const rawId = p?.id || p?._id || String(Math.random());
  return {
    ...p,
    id: String(rawId),
    _id: String(rawId),
    name: p?.name || p?.title || "Untitled Project",
    description: p?.description || "",
    taskCount: p?.taskCount || p?.tasks?.length || 0,
  };
}

// ---------------------------------------------------------------------------
// Paged fetching
// ---------------------------------------------------------------------------

/** Rows requested per API call while walking pages. */
const FETCH_PAGE_SIZE = 100;
/** Hard stop so a misbehaving endpoint can't spin forever. */
const MAX_PAGES = 50;

/** The tasks/projects endpoints have been seen returning all of these shapes. */
function extractItems(res: any): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data?.tasks)) return res.data.tasks;
  if (Array.isArray(res?.data?.projects)) return res.data.projects;
  if (Array.isArray(res?.tasks)) return res.tasks;
  if (Array.isArray(res?.projects)) return res.projects;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.item)) return res.item;
  if (res?.item && typeof res.item === "object") return [res.item];
  return [];
}

/** Total row count, if the response advertises one. */
function extractTotal(res: any): number | null {
  const candidates = [
    res?.total, res?.totalItems, res?.totalCount,
    res?.pagination?.total, res?.pagination?.totalItems,
    res?.data?.total, res?.data?.totalCount,
  ];
  const n = candidates.find((v) => typeof v === "number" && v >= 0);
  return typeof n === "number" ? n : null;
}

function extractTotalPages(res: any): number | null {
  const candidates = [res?.totalPages, res?.pagination?.totalPages, res?.data?.totalPages];
  const n = candidates.find((v) => typeof v === "number" && v > 0);
  return typeof n === "number" ? n : null;
}

async function fetchAllPages(path: string, baseParams: URLSearchParams): Promise<any[]> {
  const seen = new Set<string>();
  const out: any[] = [];

  // 1. First attempt: fetch page 1 with limit=100
  try {
    const qs = new URLSearchParams(baseParams);
    qs.set("page", "1");
    qs.set("limit", String(FETCH_PAGE_SIZE));

    const res = await apiFetch<any>(`${path}?${qs.toString()}`);
    const items = extractItems(res);
    for (const item of items) {
      const id = String(item?.id ?? item?._id ?? "");
      if (id) {
        if (seen.has(id)) continue;
        seen.add(id);
      }
      out.push(item);
    }

    const total = extractTotal(res);
    const totalPages = extractTotalPages(res);
    if (total !== null && out.length >= total) return out;
    if (totalPages !== null && totalPages <= 1) return out;
    if (items.length === 0) {
      // Fallback: try raw path without pagination query params
      const rawRes = await apiFetch<any>(path);
      const rawItems = extractItems(rawRes);
      if (rawItems.length > 0) return rawItems;
    }
  } catch {
    // If request with query params failed, try raw path
    try {
      const fallbackRes = await apiFetch<any>(path);
      const fallbackItems = extractItems(fallbackRes);
      if (fallbackItems.length > 0) return fallbackItems;
    } catch {}
  }

  // 2. Fetch remaining pages if multiple pages exist
  for (let page = 2; page <= MAX_PAGES; page++) {
    const qs = new URLSearchParams(baseParams);
    qs.set("page", String(page));
    qs.set("limit", String(FETCH_PAGE_SIZE));

    try {
      const res = await apiFetch<any>(`${path}?${qs.toString()}`);
      const items = extractItems(res);
      if (items.length === 0) break;

      let added = 0;
      for (const item of items) {
        const id = String(item?.id ?? item?._id ?? "");
        if (id) {
          if (seen.has(id)) continue;
          seen.add(id);
        }
        out.push(item);
        added++;
      }

      if (added === 0) break;

      const total = extractTotal(res);
      if (total !== null && out.length >= total) break;

      const totalPages = extractTotalPages(res);
      if (totalPages !== null && page >= totalPages) break;
    } catch {
      break;
    }
  }

  return out;
}

export function useTasksQuery(params: { search?: string; status?: string; priority?: string; projectId?: string } = {}) {
  const { search = "", status = "all", priority = "all", projectId } = params;
  return useQuery({
    queryKey: ["tasks", search, status, priority, projectId],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      if (status && status !== "all") qs.set("status", status);
      if (priority && priority !== "all") qs.set("priority", priority);
      if (projectId) qs.set("projectId", projectId);
      
      let rawList = await fetchAllPages("/api/tasks", qs);
      if (rawList.length === 0) {
        try {
          const empTasks = await fetchAllPages("/api/employees/me/tasks", qs);
          if (empTasks.length > 0) rawList = empTasks;
        } catch {}
      }
      return rawList.map(normalizeTask);
    },
  });
}

export function useProjectsQuery(search = "") {
  return useQuery({
    queryKey: ["projects", search],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      const rawList = await fetchAllPages("/api/projects", qs);
      return rawList.map(normalizeProject);
    },
  });
}

export function useWorkspaceUsers() {
  return useQuery({
    queryKey: ["workspace-users"],
    queryFn: async () => {
      try {
        const res = await apiFetch<any>("/api/users/all");
        const raw = res?.data !== undefined ? res.data : res;
        const list = Array.isArray(raw) ? raw : (raw?.items || raw?.employees || raw?.data || []);
        if (Array.isArray(list) && list.length > 0) return list;
      } catch {}
      try {
        const res = await apiFetch<any>("/api/employees");
        const raw = res?.data !== undefined ? res.data : res;
        const list = Array.isArray(raw) ? raw : (raw?.items || raw?.employees || raw?.data || []);
        if (Array.isArray(list) && list.length > 0) return list;
      } catch {}
      try {
        const res = await apiFetch<any>("/api/users");
        const raw = res?.data !== undefined ? res.data : res;
        const list = Array.isArray(raw) ? raw : (raw?.items || raw?.employees || raw?.data || []);
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
  });
}

export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: ["task-comments", taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const res: any = await getTaskComments(taskId as string);
      return (res?.items || res?.data?.items || res?.data || (Array.isArray(res) ? res : [])) as TaskComment[];
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Task>) => apiFetch("/api/tasks", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Project> & { tasks?: Partial<Task>[] }) =>
      apiFetch("/api/projects", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      apiFetch(`/api/tasks/${taskId}`, { method: "PUT", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTaskPriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, priority }: { taskId: string; priority: TaskPriority }) =>
      apiFetch(`/api/tasks/${taskId}`, { method: "PUT", body: JSON.stringify({ priority }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTaskAttachments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, attachments }: { taskId: string; attachments: any[] }) =>
      apiFetch(`/api/tasks/${taskId}`, { method: "PUT", body: JSON.stringify({ attachments }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useToggleSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_vars: { taskId: string; subtaskId: string; completed: boolean }) => Promise.resolve(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => apiFetch(`/api/tasks/${taskId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function usePostComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, message }: { taskId: string; message: string }) => addTaskComment(taskId, message),
    onSuccess: (_res, variables) => qc.invalidateQueries({ queryKey: ["task-comments", variables.taskId] }),
  });
}

export function useTopContributors() {
  return useQuery({
    queryKey: ["top-contributors"],
    queryFn: async () => [] as any[],
  });
}
