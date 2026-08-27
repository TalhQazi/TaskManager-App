import React, { useMemo, useState } from "react";
import { View, SectionList, Text, StyleSheet, TouchableOpacity } from "react-native";
import { CalendarCheck2, Flame, ArrowRight, ListTodo } from "lucide-react-native";
import { useTaskTheme } from "../theme";
import { Task } from "../types";
import { bucketForTask } from "../dateBuckets";
import TaskRow from "../TaskRow";
import SectionHeader from "../SectionHeader";
import EmptyState from "../EmptyState";
import QuickAddBar, { QuickAddValue } from "../QuickAddBar";

interface TodayViewProps {
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onQuickAdd?: (value: QuickAddValue) => void;
  onSwitchToAll?: () => void;
  canCreate?: boolean;
}

export default function TodayView({ tasks, onOpenTask, onToggleComplete, onQuickAdd, onSwitchToAll, canCreate }: TodayViewProps) {
  const theme = useTaskTheme();
  const [showCompleted, setShowCompleted] = useState(false);

  const sections = useMemo(() => {
    const overdue: Task[] = [];
    const today: Task[] = [];
    const otherActive: Task[] = [];
    const completed: Task[] = [];

    for (const t of tasks) {
      if (t.status === "completed") {
        const bucket = bucketForTask(t);
        if (bucket === "today" || bucket === "overdue") completed.push(t);
        continue;
      }
      const bucket = bucketForTask(t);
      if (bucket === "overdue") overdue.push(t);
      else if (bucket === "today") today.push(t);
      else otherActive.push(t);
    }

    const highPriorityToday = today.filter((t) => t.priority === "high" || t.priority === "urgent");
    const rest = today.filter((t) => t.priority !== "high" && t.priority !== "urgent");

    const out: { title: string; tone?: "danger"; data: Task[] }[] = [];
    if (overdue.length) out.push({ title: "Overdue", tone: "danger", data: overdue });
    if (highPriorityToday.length) out.push({ title: "High Priority", data: highPriorityToday });
    if (rest.length) out.push({ title: "Today", data: rest });
    if (showCompleted && completed.length) out.push({ title: "Completed Today", data: completed });

    // If nothing due today or overdue, surface other active tasks so the user sees their workload
    if (overdue.length === 0 && today.length === 0 && otherActive.length > 0) {
      out.push({ title: "Other Active Tasks", data: otherActive.slice(0, 10) });
    }

    return out;
  }, [tasks, showCompleted]);

  const completedTodayCount = tasks.filter((t) => t.status === "completed" && bucketForTask(t) === "today").length;
  const activeTodayCount = tasks.filter((t) => t.status !== "completed" && (bucketForTask(t) === "today" || bucketForTask(t) === "overdue")).length;
  const totalTodayCount = completedTodayCount + activeTodayCount;
  const progressPercent = totalTodayCount > 0 ? Math.round((completedTodayCount / totalTodayCount) * 100) : 0;
  const totalActive = tasks.filter((t) => t.status !== "completed").length;
  const isEmpty = sections.every((s) => s.data.length === 0);

  return (
    <View style={styles.container}>
      {totalTodayCount > 0 && (
        <View
          style={[
            styles.progressCard,
            {
              backgroundColor: theme.bg.surface,
              borderColor: theme.border.default,
            },
          ]}
        >
          <View style={styles.progressHeader}>
            <View style={styles.progressTitleGroup}>
              <Flame size={15} color={theme.accent.primary} />
              <Text style={[styles.progressTitle, { color: theme.text.primary }]}>Daily Focus</Text>
            </View>
            <Text style={[styles.progressStat, { color: theme.accent.success }]}>
              {completedTodayCount} of {totalTodayCount} done ({progressPercent}%)
            </Text>
          </View>
          <View style={[styles.progressBarTrack, { backgroundColor: theme.bg.inset }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%`, backgroundColor: theme.accent.success },
              ]}
            />
          </View>
        </View>
      )}

      {onQuickAdd && canCreate && (
        <View style={styles.quickAddWrap}>
          <QuickAddBar placeholder="Add a task for today…" onSubmit={(v) => onQuickAdd({ ...v, dueDate: v.dueDate || new Date().toISOString() })} />
        </View>
      )}

      {isEmpty ? (
        <EmptyState
          icon={CalendarCheck2}
          title="Nothing due today"
          description={totalActive > 0 ? `You have ${totalActive} active tasks in other views.` : "You're all caught up. Tap 'Add Task' to create one."}
          actionLabel={totalActive > 0 ? `View All Tasks (${totalActive})` : undefined}
          onAction={totalActive > 0 ? onSwitchToAll : undefined}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskRow task={item} onPress={() => onOpenTask(item)} onToggleComplete={() => onToggleComplete(item)} />
          )}
          renderSectionHeader={({ section }) => <SectionHeader title={section.title} count={section.data.length} tone={section.tone} />}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          ListFooterComponent={
            totalActive > 0 && onSwitchToAll ? (
              <TouchableOpacity
                style={[
                  styles.viewAllBanner,
                  {
                    backgroundColor: theme.bg.surface,
                    borderColor: theme.border.default,
                  },
                ]}
                onPress={onSwitchToAll}
                activeOpacity={0.75}
              >
                <View style={styles.viewAllLeft}>
                  <ListTodo size={16} color={theme.accent.primary} />
                  <Text style={[styles.viewAllText, { color: theme.text.primary }]}>
                    View all {totalActive} tasks
                  </Text>
                </View>
                <ArrowRight size={15} color={theme.text.tertiary} />
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {completedTodayCount > 0 && (
        <TouchableOpacity style={styles.revealCompletedBtn} onPress={() => setShowCompleted(!showCompleted)} activeOpacity={0.7}>
          <Text style={[styles.revealCompleted, { color: theme.text.secondary }]}>
            {showCompleted ? "Hide completed today" : `${completedTodayCount} completed today · tap to show`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressTitle: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  progressStat: {
    fontSize: 12,
    fontWeight: "700",
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  quickAddWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  listContent: {
    paddingBottom: 40,
  },
  viewAllBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  viewAllLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "700",
  },
  revealCompletedBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  revealCompleted: {
    fontSize: 12,
    fontWeight: "600",
  },
});
