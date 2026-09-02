import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, TextInput } from "react-native";
import { FolderKanban, Plus, ChevronRight, Layers, Search, X } from "lucide-react-native";
import { useTaskTheme } from "../theme";
import { Project, Task } from "../types";
import ProjectProgressBar from "../ProjectProgressBar";
import EmptyState from "../EmptyState";
import Pagination from "@/components/ui/Pagination";
import { toProxiedUrl } from "@/util/toProxiedUrl";

/** Rows per page, matching the task list. */
const PAGE_SIZE = 25;

interface ProjectsViewProps {
  projects: Project[];
  tasks: Task[];
  onOpenProject: (project: Project) => void;
  onCreateProject?: () => void;
  canCreate?: boolean;
}

function projectIdOf(task: Task): string | undefined {
  return typeof task.projectId === "string" ? task.projectId : task.projectId?._id || task.projectId?.id;
}

export default function ProjectsView({ projects, tasks, onOpenProject, onCreateProject, canCreate }: ProjectsViewProps) {
  const theme = useTaskTheme();
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const map: Record<string, { total: number; completed: number }> = {};
    for (const t of tasks) {
      const pid = projectIdOf(t);
      if (!pid) continue;
      if (!map[pid]) map[pid] = { total: 0, completed: 0 };
      map[pid].total += 1;
      if (t.status === "completed") map[pid].completed += 1;
    }
    return map;
  }, [tasks]);

  const filteredProjects = useMemo(() => {
    if (!query.trim()) return projects;
    const q = query.trim().toLowerCase();
    return projects.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [projects, query]);

  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  useEffect(() => {
    setPage(1);
  }, [query, projects.length]);

  const paged = useMemo(
    () => filteredProjects.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredProjects, safePage]
  );

  return (
    <View style={styles.container}>
      {/* Search Header */}
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
          placeholder="Search projects by name or description…"
          placeholderTextColor={theme.text.tertiary}
          style={[styles.searchInput, { color: theme.text.primary }]}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={15} color={theme.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Group related tasks into a project to track progress as a whole."
          actionLabel={canCreate ? "New Project" : undefined}
          onAction={canCreate ? onCreateProject : undefined}
        />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No matching projects"
          description={`No project matches "${query}". Try searching with a different term.`}
          actionLabel="Clear Search"
          onAction={() => setQuery("")}
        />
      ) : (
        <FlatList
          data={paged}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            canCreate && onCreateProject ? (
              <TouchableOpacity
                style={[
                  styles.newProjectBtn,
                  {
                    borderColor: theme.accent.primary,
                    backgroundColor: theme.accent.primarySoft,
                  },
                ]}
                onPress={onCreateProject}
                activeOpacity={0.8}
              >
                <Plus size={15} color={theme.accent.primary} strokeWidth={2.5} />
                <Text style={[styles.newProjectText, { color: theme.accent.primary }]}>New Project</Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => {
            const stats = counts[item.id] || { total: item.taskCount || 0, completed: 0 };
            const rawLogo = item.logo?.url || item.logoUrl;
            const logoUrl = rawLogo ? (toProxiedUrl(rawLogo) || rawLogo) : null;
            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.bg.surface,
                    borderColor: theme.border.default,
                  },
                ]}
                onPress={() => onOpenProject(item)}
                activeOpacity={0.7}
              >
                <View style={styles.cardTop}>
                  {logoUrl ? (
                    <Image source={{ uri: logoUrl }} style={styles.logo} />
                  ) : (
                    <View style={[styles.logoFallback, { backgroundColor: theme.accent.primarySoft }]}>
                      <Layers size={18} color={theme.accent.primary} />
                    </View>
                  )}
                  <View style={styles.cardTitleWrap}>
                    <Text style={[styles.cardTitle, { color: theme.text.primary }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {!!item.description && (
                      <Text style={[styles.cardDesc, { color: theme.text.secondary }]} numberOfLines={1}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                  <ChevronRight size={18} color={theme.text.tertiary} />
                </View>
                <ProjectProgressBar completed={stats.completed} total={stats.total} />
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            <Pagination
              page={safePage}
              pageCount={pageCount}
              onPageChange={setPage}
              totalItems={filteredProjects.length}
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
  listContent: { padding: 16, gap: 12, paddingBottom: 40 },
  newProjectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  newProjectText: { fontWeight: "700", fontSize: 13.5 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  logo: { width: 38, height: 38, borderRadius: 10 },
  logoFallback: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleWrap: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", letterSpacing: -0.2 },
  cardDesc: { fontSize: 12, marginTop: 2 },
});
