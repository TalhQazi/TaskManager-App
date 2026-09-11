import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { differenceInCalendarDays, format } from "date-fns";
import { Link2 } from "lucide-react-native";
import { useTaskWorkspace } from "../TaskWorkspaceContext";
import {
  STATUS_COLUMNS,
  TaskView,
  useTaskDependencies,
  useWorkspaceTaskDataset,
} from "../data/workspaceApi";
import { useTaskTheme } from "@/components/tasks/theme";
import { ViewLoading, ViewEmpty } from "./shared";

const PX_PER_DAY = 32;

function taskSpan(t: TaskView) {
  const start = t.firstStartedAt || t.startedAt || t.createdAt || t.dueDate;
  const end = t.completedAt || t.dueDate || start;
  return {
    start: start ? new Date(start) : null,
    end: end ? new Date(end) : null,
  };
}

export default function WorkspaceTimelineView() {
  const theme = useTaskTheme();
  const { filters, setSelectedTask } = useTaskWorkspace();
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useWorkspaceTaskDataset(filters);

  const tasks: TaskView[] = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data]);

  const taskIds = useMemo(() => tasks.map((t) => t.id).slice(0, 100), [tasks]);
  const { data: deps } = useTaskDependencies(taskIds);

  const { rows, minDate, totalDays } = useMemo(() => {
    const spans = tasks
      .map((t) => ({ t, ...taskSpan(t) }))
      .filter((s) => s.start && !isNaN(s.start.getTime()));

    if (!spans.length) {
      return { rows: [], minDate: new Date(), totalDays: 1 };
    }

    const minTime = Math.min(...spans.map((s) => s.start!.getTime()));
    const maxTime = Math.max(
      ...spans.map((s) => (s.end && !isNaN(s.end.getTime()) ? s.end.getTime() : s.start!.getTime()))
    );

    const min = new Date(minTime);
    const max = new Date(maxTime);
    const total = Math.max(1, Math.min(differenceInCalendarDays(max, min) + 1, 90)); // cap at 90 days for mobile rendering
    return { rows: spans, minDate: min, totalDays: total };
  }, [tasks]);

  const depCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of deps || []) {
      map.set(d.predecessorId, (map.get(d.predecessorId) || 0) + 1);
      map.set(d.successorId, (map.get(d.successorId) || 0) + 1);
    }
    return map;
  }, [deps]);

  if (isLoading) return <ViewLoading />;
  if (!rows.length) {
    return <ViewEmpty label="No tasks with dates found to plot on timeline." />;
  }

  const timelineWidth = Math.max(totalDays * PX_PER_DAY, 320);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.canvas }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={{ minWidth: 160 + timelineWidth }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.accent.primary}
            />
          }
        >
          <View style={styles.chartWrapper}>
            {/* Left Column: Fixed Titles */}
            <View
              style={[
                styles.leftColumn,
                {
                  backgroundColor: theme.bg.surface,
                  borderRightColor: theme.border.default,
                },
              ]}
            >
              {/* Header Spacer */}
              <View
                style={[
                  styles.rulerRow,
                  { borderBottomColor: theme.border.default },
                ]}
              >
                <Text
                  style={[styles.columnHeaderText, { color: theme.text.tertiary }]}
                >
                  TASKS
                </Text>
              </View>

              {/* Task Rows */}
              {rows.map(({ t }) => {
                const hasDeps = (depCount.get(t.id) || 0) > 0;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.taskRow,
                      { borderBottomColor: theme.border.subtle },
                    ]}
                    onPress={() => setSelectedTask(t)}
                    activeOpacity={0.7}
                  >
                    {hasDeps && (
                      <Link2 size={12} color={theme.accent.primary} style={{ marginRight: 4 }} />
                    )}
                    <Text
                      style={[styles.taskRowTitle, { color: theme.text.primary }]}
                      numberOfLines={1}
                    >
                      {t.title || "Untitled"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Right Pane: Gantt Bars */}
            <View style={{ width: timelineWidth, backgroundColor: theme.bg.canvas }}>
              {/* Date Ruler Header */}
              <View
                style={[
                  styles.rulerRow,
                  { borderBottomColor: theme.border.default },
                ]}
              >
                {Array.from({ length: totalDays }).map((_, i) => {
                  const dayDate = new Date(minDate.getTime() + i * 86400000);
                  const isWeekStart = i % 7 === 0;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.rulerTick,
                        {
                          left: i * PX_PER_DAY,
                          width: PX_PER_DAY,
                          borderLeftColor: theme.border.subtle,
                        },
                      ]}
                    >
                      {isWeekStart && (
                        <Text
                          style={[
                            styles.rulerDateText,
                            { color: theme.text.tertiary },
                          ]}
                        >
                          {format(dayDate, "MMM d")}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Task Bar Rows */}
              {rows.map(({ t, start, end }) => {
                const offset = Math.max(0, differenceInCalendarDays(start!, minDate));
                const len = Math.max(
                  1,
                  differenceInCalendarDays(end || start!, start!) + 1
                );
                const statusCol =
                  STATUS_COLUMNS.find((s) => s.key === t.status) ||
                  STATUS_COLUMNS[0];

                const barLeft = offset * PX_PER_DAY;
                const barWidth = Math.max(len * PX_PER_DAY - 4, 24);

                return (
                  <View
                    key={t.id}
                    style={[
                      styles.barRow,
                      { borderBottomColor: theme.border.subtle },
                    ]}
                  >
                    {/* Horizontal bar */}
                    <TouchableOpacity
                      style={[
                        styles.ganttBar,
                        {
                          left: barLeft,
                          width: barWidth,
                          backgroundColor: statusCol.color,
                        },
                      ]}
                      onPress={() => setSelectedTask(t)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.barText} numberOfLines={1}>
                        {t.title}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chartWrapper: {
    flexDirection: "row",
  },
  leftColumn: {
    width: 150,
    borderRightWidth: 1,
    zIndex: 2,
  },
  columnHeaderText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    paddingHorizontal: 8,
  },
  rulerRow: {
    height: 36,
    borderBottomWidth: 1,
    position: "relative",
    justifyContent: "center",
  },
  rulerTick: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderLeftWidth: 1,
    paddingLeft: 2,
    justifyContent: "center",
  },
  rulerDateText: {
    fontSize: 9,
    fontWeight: "600",
  },
  taskRow: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  taskRowTitle: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  barRow: {
    height: 40,
    position: "relative",
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
  },
  ganttBar: {
    position: "absolute",
    height: 24,
    borderRadius: 6,
    justifyContent: "center",
    paddingHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  barText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
});
