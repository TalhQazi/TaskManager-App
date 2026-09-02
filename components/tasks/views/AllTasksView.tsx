import React, { useEffect, useMemo, useState } from "react";
import { View, FlatList, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { Search, ListTodo, X } from "lucide-react-native";
import { useTaskTheme } from "../theme";
import { Task, PRIORITY_ORDER } from "../types";
import TaskRow from "../TaskRow";
import EmptyState from "../EmptyState";
import FilterBar, { TaskFilters } from "../FilterBar";
import QuickAddBar, { QuickAddValue } from "../QuickAddBar";
import Pagination from "@/components/ui/Pagination";

/** Rows per page. The full result set stays in memory; only the slice rendered changes. */
const PAGE_SIZE = 25;

interface AllTasksViewProps {
  tasks: Task[];
  projectOptions: { id: string; name: string }[];
  onOpenTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onQuickAdd?: (value: QuickAddValue) => void;
  canCreate?: boolean;
  hideCompleted?: boolean;
}

export default function AllTasksView({
  tasks,
  projectOptions,
  onOpenTask,
  onToggleComplete,
  onQuickAdd,
  canCreate,
  hideCompleted = false,
}: AllTasksViewProps) {
  const theme = useTaskTheme();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<TaskFilters>({ status: "all", priority: "all", projectId: "all" });

  const filtered = useMemo(() => {
    let list = tasks;
    if (hideCompleted) list = list.filter((t) => t.status !== "completed");
    if (filters.status && filters.status !== "all") list = list.filter((t) => t.status === filters.status);
    if (filters.priority && filters.priority !== "all") list = list.filter((t) => t.priority === filters.priority);
    if (filters.projectId && filters.projectId !== "all") {
      list = list.filter((t) => {
        const pid = typeof t.projectId === "string" ? t.projectId : t.projectId?._id || t.projectId?.id;
        return pid === filters.projectId;
      });
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.projectName?.toLowerCase().includes(q) ||
          t.assignees?.some((a) => a.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (b.status === "completed" && a.status !== "completed") return -1;
      const pDiff = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
      if (pDiff !== 0) return pDiff;
      return (a.dueDate || "").localeCompare(b.dueDate || "");
    });
  }, [tasks, filters, query, hideCompleted]);

  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Any change to the result set puts the reader back on page 1 — otherwise filtering
  // down to 8 rows while sitting on page 3 shows an empty list.
  useEffect(() => {
    setPage(1);
  }, [query, filters, hideCompleted, tasks.length]);

  // Guard against a stale page index if the list shrank underneath us.
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  );

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.searchWrap,
          {
            backgroundColor: theme.bg.surface,
            borderColor: theme.border.default,
          },
        ]}
      >
        <Search size={15} color={theme.text.tertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search tasks, projects, assignees…"
          placeholderTextColor={theme.text.tertiary}
          style={[styles.searchInput, { color: theme.text.primary }]}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={15} color={theme.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>
      <FilterBar filters={filters} onChange={setFilters} projectOptions={projectOptions} />
      {onQuickAdd && canCreate && (
        <View style={styles.quickAddWrap}>
          <QuickAddBar projectOptions={projectOptions} onSubmit={onQuickAdd} />
        </View>
      )}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={query || filters.status !== "all" || filters.priority !== "all" ? "No matching tasks" : "No tasks yet"}
          description={
            query || filters.status !== "all" || filters.priority !== "all"
              ? "Try clearing a filter or searching something else."
              : "Tasks you create or get assigned will show up here."
          }
        />
      ) : (
        <FlatList
          data={paged}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskRow task={item} onPress={() => onOpenTask(item)} onToggleComplete={() => onToggleComplete(item)} />
          )}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            <Pagination
              page={safePage}
              pageCount={pageCount}
              onPageChange={setPage}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 13.5 },
  quickAddWrap: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 },
  listContent: { paddingBottom: 40, paddingTop: 4 },
});
