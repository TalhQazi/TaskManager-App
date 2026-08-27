import React, { useMemo } from "react";
import { View, SectionList, StyleSheet } from "react-native";
import { CalendarDays } from "lucide-react-native";
import { useTaskTheme } from "../theme";
import { Task, TaskBucket } from "../types";
import { bucketForTask, BUCKET_LABEL } from "../dateBuckets";
import TaskRow from "../TaskRow";
import SectionHeader from "../SectionHeader";
import EmptyState from "../EmptyState";
import QuickAddBar from "../QuickAddBar";

interface UpcomingViewProps {
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onQuickAdd?: (value: any) => void;
  canCreate?: boolean;
}

const ORDER: TaskBucket[] = ["tomorrow", "this-week", "next-week", "later"];

export default function UpcomingView({ tasks, onOpenTask, onToggleComplete, onQuickAdd, canCreate }: UpcomingViewProps) {
  const theme = useTaskTheme();
  const sections = useMemo(() => {
    const buckets: Record<string, Task[]> = { tomorrow: [], "this-week": [], "next-week": [], later: [] };
    for (const t of tasks) {
      if (t.status === "completed") continue;
      const b = bucketForTask(t);
      if (buckets[b]) buckets[b].push(t);
    }
    return ORDER.filter((b) => buckets[b].length > 0).map((b) => ({ title: BUCKET_LABEL[b], data: buckets[b] }));
  }, [tasks]);

  const tomorrowDate = new Date(Date.now() + 86400000).toISOString();

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        onQuickAdd && canCreate ? (
          <View style={styles.quickAddWrap}>
            <QuickAddBar
              placeholder="Add an upcoming task…"
              onSubmit={(v) => onQuickAdd({ ...v, dueDate: v.dueDate || tomorrowDate })}
            />
          </View>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState
          icon={CalendarDays}
          title="Nothing scheduled ahead"
          description="Tasks with a due date beyond today will show up here, grouped by when they're coming."
        />
      }
      renderItem={({ item }) => (
        <TaskRow task={item} onPress={() => onOpenTask(item)} onToggleComplete={() => onToggleComplete(item)} />
      )}
      renderSectionHeader={({ section }) => <SectionHeader title={section.title} count={section.data.length} />}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  quickAddWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  listContent: { paddingBottom: 40 },
});
