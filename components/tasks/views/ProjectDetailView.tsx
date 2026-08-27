import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from "react-native";
import { ChevronLeft, FolderKanban, Layers } from "lucide-react-native";
import { useTaskTheme } from "../theme";
import { Project, Task } from "../types";
import ProjectProgressBar from "../ProjectProgressBar";
import TaskRow from "../TaskRow";
import EmptyState from "../EmptyState";
import QuickAddBar, { QuickAddValue } from "../QuickAddBar";
import { MobileCostManager } from "@/components/cost-manager/MobileCostManager";
import Pagination from "@/components/ui/Pagination";
import { toProxiedUrl } from "@/util/toProxiedUrl";

const PAGE_SIZE = 25;
type Tab = "tasks" | "cost";

interface ProjectDetailViewProps {
  project: Project;
  tasks: Task[];
  onBack: () => void;
  onOpenTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onQuickAdd: (value: QuickAddValue) => void;
  canManageCost?: boolean;
  canCreate?: boolean;
}

function projectIdOf(task: Task): string | undefined {
  return typeof task.projectId === "string" ? task.projectId : task.projectId?._id || task.projectId?.id;
}

export default function ProjectDetailView({
  project,
  tasks,
  onBack,
  onOpenTask,
  onToggleComplete,
  onQuickAdd,
  canManageCost,
  canCreate,
}: ProjectDetailViewProps) {
  const theme = useTaskTheme();
  const [tab, setTab] = useState<Tab>("tasks");
  const projectTasks = useMemo(() => tasks.filter((t) => projectIdOf(t) === project.id), [tasks, project.id]);
  const completed = projectTasks.filter((t) => t.status === "completed").length;
  const rawLogo = project.logo?.url || project.logoUrl;
  const logoUrl = rawLogo ? (toProxiedUrl(rawLogo) || rawLogo) : null;

  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(projectTasks.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  useEffect(() => {
    setPage(1);
  }, [projectTasks.length]);

  const pagedTasks = useMemo(
    () => projectTasks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [projectTasks, safePage]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.canvas }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} />
        ) : (
          <View style={[styles.logoFallback, { backgroundColor: theme.accent.primarySoft }]}>
            <Layers size={18} color={theme.accent.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text.primary }]} numberOfLines={1}>
            {project.name}
          </Text>
          {!!project.description && (
            <Text style={[styles.description, { color: theme.text.secondary }]} numberOfLines={1}>
              {project.description}
            </Text>
          )}
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressWrap}>
        <ProjectProgressBar completed={completed} total={projectTasks.length} />
      </View>

      {/* Tabs */}
      {canManageCost && (
        <View style={[styles.tabRow, { borderBottomColor: theme.border.subtle }]}>
          <TouchableOpacity
            style={[styles.tab, tab === "tasks" && { borderBottomColor: theme.accent.primary }]}
            onPress={() => setTab("tasks")}
          >
            <Text style={[styles.tabText, { color: tab === "tasks" ? theme.accent.primary : theme.text.secondary }]}>
              Tasks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === "cost" && { borderBottomColor: theme.accent.primary }]}
            onPress={() => setTab("cost")}
          >
            <Text style={[styles.tabText, { color: tab === "cost" ? theme.accent.primary : theme.text.secondary }]}>
              Cost Sheet
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {tab === "tasks" ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {canCreate && (
            <View style={styles.quickAddWrap}>
              <QuickAddBar placeholder="Add a task to this project…" onSubmit={(v) => onQuickAdd({ ...v, projectId: project.id })} />
            </View>
          )}
          {projectTasks.length === 0 ? (
            <EmptyState title="No tasks in this project yet" description="Add the first task above to get moving." />
          ) : (
            <>
              {pagedTasks.map((t) => (
                <TaskRow key={t.id} task={t} onPress={() => onOpenTask(t)} onToggleComplete={() => onToggleComplete(t)} showProject={false} />
              ))}
              <Pagination
                page={safePage}
                pageCount={pageCount}
                onPageChange={setPage}
                totalItems={projectTasks.length}
                pageSize={PAGE_SIZE}
                style={{ marginTop: 16 }}
              />
            </>
          )}
        </ScrollView>
      ) : (
        <MobileCostManager projectId={project.id} projectName={project.name} tasks={projectTasks as any} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  logo: { width: 36, height: 36, borderRadius: 10 },
  logoFallback: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, fontWeight: "700", letterSpacing: -0.2 },
  description: { fontSize: 12, marginTop: 1 },
  progressWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  tabRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, borderBottomWidth: 1 },
  tab: { paddingVertical: 10, marginRight: 16, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 13, fontWeight: "700" },
  listContent: { paddingBottom: 40 },
  quickAddWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
});
