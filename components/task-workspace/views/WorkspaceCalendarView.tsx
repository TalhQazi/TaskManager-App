import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react-native";
import { useTaskWorkspace } from "../TaskWorkspaceContext";
import { STATUS_COLUMNS, TaskView, useWorkspaceTaskDataset } from "../data/workspaceApi";
import { useTaskTheme } from "@/components/tasks/theme";
import { ViewLoading, PriorityBadge, StatusBadge, AvatarStack } from "./shared";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function WorkspaceCalendarView() {
  const theme = useTaskTheme();
  const { filters, setSelectedTask } = useTaskWorkspace();
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    hasNextPage,
    fetchNextPage,
  } = useWorkspaceTaskDataset(filters);

  const tasks: TaskView[] = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, TaskView[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const d = new Date(t.dueDate);
      if (isNaN(d.getTime())) continue;
      const key = format(d, "yyyy-MM-dd");
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(t);
    }
    return map;
  }, [tasks]);

  const selectedDayKey = format(selectedDate, "yyyy-MM-dd");
  const selectedDayTasks = byDay.get(selectedDayKey) || [];

  if (isLoading) return <ViewLoading />;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={theme.accent.primary}
        />
      }
    >
      {/* Calendar Header / Navigation */}
      <View style={styles.navBar}>
        <View style={styles.monthTitleWrapper}>
          <CalendarIcon size={18} color={theme.accent.primary} />
          <Text style={[styles.monthTitle, { color: theme.text.primary }]}>
            {format(cursor, "MMMM yyyy")}
          </Text>
        </View>
        <View style={styles.navActions}>
          <TouchableOpacity
            style={[styles.navBtn, { borderColor: theme.border.default }]}
            onPress={() => setCursor(subMonths(cursor, 1))}
          >
            <ChevronLeft size={16} color={theme.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.todayBtn,
              {
                backgroundColor: theme.bg.surfaceRaised,
                borderColor: theme.border.default,
              },
            ]}
            onPress={() => {
              const now = new Date();
              setCursor(now);
              setSelectedDate(now);
            }}
          >
            <Text style={[styles.todayText, { color: theme.text.primary }]}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, { borderColor: theme.border.default }]}
            onPress={() => setCursor(addMonths(cursor, 1))}
          >
            <ChevronRight size={16} color={theme.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekday Row */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((w) => (
          <Text
            key={w}
            style={[styles.weekdayText, { color: theme.text.tertiary }]}
          >
            {w}
          </Text>
        ))}
      </View>

      {/* Days Grid (7 columns) */}
      <View style={[styles.grid, { borderColor: theme.border.default }]}>
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayItems = byDay.get(key) || [];
          const inCurrentMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDate);

          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.dayCell,
                {
                  backgroundColor: isSelected
                    ? theme.accent.primarySoft
                    : inCurrentMonth
                    ? theme.bg.surface
                    : theme.bg.canvas,
                  borderColor: isSelected
                    ? theme.accent.primary
                    : theme.border.subtle,
                },
              ]}
              onPress={() => setSelectedDate(day)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayNumber,
                  {
                    color: isToday
                      ? theme.accent.primary
                      : inCurrentMonth
                      ? theme.text.primary
                      : theme.text.tertiary,
                    fontWeight: isToday || isSelected ? "700" : "500",
                  },
                ]}
              >
                {format(day, "d")}
              </Text>

              {/* Status dots */}
              <View style={styles.dotsRow}>
                {dayItems.slice(0, 3).map((item, idx) => {
                  const sColor =
                    STATUS_COLUMNS.find((s) => s.key === item.status)?.color ||
                    "#64748B";
                  return (
                    <View
                      key={`${item.id}-${idx}`}
                      style={[styles.taskDot, { backgroundColor: sColor }]}
                    />
                  );
                })}
                {dayItems.length > 3 && (
                  <Text style={[styles.moreCount, { color: theme.text.tertiary }]}>
                    +{dayItems.length - 3}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Day Agenda Header & Tasks */}
      <View style={styles.agendaSection}>
        <View style={styles.agendaHeader}>
          <Text style={[styles.agendaTitle, { color: theme.text.primary }]}>
            Tasks for {format(selectedDate, "EEE, MMM d, yyyy")}
          </Text>
          <View
            style={[
              styles.badgeCount,
              { backgroundColor: theme.bg.surfaceRaised },
            ]}
          >
            <Text style={[styles.badgeCountText, { color: theme.text.secondary }]}>
              {selectedDayTasks.length} {selectedDayTasks.length === 1 ? "task" : "tasks"}
            </Text>
          </View>
        </View>

        {selectedDayTasks.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[
              styles.taskCard,
              {
                backgroundColor: theme.bg.surface,
                borderColor: theme.border.default,
              },
            ]}
            onPress={() => setSelectedTask(t)}
            activeOpacity={0.7}
          >
            <View style={styles.taskCardLeft}>
              <Text
                style={[styles.taskCardTitle, { color: theme.text.primary }]}
                numberOfLines={1}
              >
                {t.taskNumber ? `#${t.taskNumber} ` : ""}
                {t.title || "Untitled"}
              </Text>
              <View style={styles.taskMetaRow}>
                <StatusBadge status={t.status} />
                <PriorityBadge priority={t.priority} />
              </View>
            </View>
            <AvatarStack assignees={t.assignees} max={2} />
          </TouchableOpacity>
        ))}

        {selectedDayTasks.length === 0 && (
          <View
            style={[
              styles.emptyAgenda,
              {
                backgroundColor: theme.bg.surface,
                borderColor: theme.border.subtle,
              },
            ]}
          >
            <Text style={[styles.emptyAgendaText, { color: theme.text.tertiary }]}>
              No tasks due on this date.
            </Text>
          </View>
        )}
      </View>

      {hasNextPage && (
        <TouchableOpacity
          style={[styles.loadMoreBtn, { borderColor: theme.border.default }]}
          onPress={() => fetchNextPage()}
        >
          <Text style={[styles.loadMoreText, { color: theme.accent.primary }]}>
            Load More Tasks For Calendar
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 12,
    gap: 12,
    paddingBottom: 40,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthTitleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  navActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  todayText: {
    fontSize: 12,
    fontWeight: "600",
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  weekdayText: {
    width: "14%",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  dayCell: {
    width: "14.28%",
    minHeight: 52,
    padding: 4,
    borderWidth: 0.5,
    justifyContent: "space-between",
  },
  dayNumber: {
    fontSize: 12,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2.5,
    flexWrap: "wrap",
    marginTop: 2,
  },
  taskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreCount: {
    fontSize: 9,
    fontWeight: "600",
  },
  agendaSection: {
    gap: 8,
    marginTop: 4,
  },
  agendaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  agendaTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  badgeCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeCountText: {
    fontSize: 11,
    fontWeight: "600",
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  taskCardLeft: {
    flex: 1,
    gap: 6,
  },
  taskCardTitle: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  taskMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emptyAgenda: {
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyAgendaText: {
    fontSize: 13,
    fontStyle: "italic",
  },
  loadMoreBtn: {
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
