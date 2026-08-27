import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight, CalendarX } from "lucide-react-native";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  isValid,
} from "date-fns";
import { useTaskTheme, type TaskThemeValue } from "../theme";
import { Task } from "../types";
import TaskRow from "../TaskRow";
import EmptyState from "../EmptyState";

interface CalendarViewProps {
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

// "What work do I have scheduled?" — a compact month grid (a dot per day with due
// tasks), not a full calendar app: tap a day to see that day's tasks below in the same
// familiar task-row format as everywhere else.
export default function CalendarView({ tasks, onOpenTask, onToggleComplete }: CalendarViewProps) {
  const theme = useTaskTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [cursor, setCursor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const d = parseISO(t.dueDate);
      if (!isValid(d)) continue;
      const key = format(d, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tasks]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const selectedKey = format(selectedDay, "yyyy-MM-dd");
  const dayTasks = tasksByDay.get(selectedKey) || [];

  return (
    <View style={styles.container}>
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={() => setCursor((c) => subMonths(c, 1))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={20} color={theme.text.secondary} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{format(cursor, "MMMM yyyy")}</Text>
        <TouchableOpacity onPress={() => setCursor((c) => addMonths(c, 1))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronRight size={20} color={theme.text.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={`${d}-${i}`} style={styles.weekdayLabel}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const count = tasksByDay.get(key)?.length || 0;
          const inMonth = isSameMonth(day, cursor);
          const selected = isSameDay(day, selectedDay);
          return (
            <TouchableOpacity
              key={key}
              style={[styles.dayCell, selected && styles.dayCellSelected]}
              onPress={() => setSelectedDay(day)}
            >
              <Text
                style={[
                  styles.dayNumber,
                  !inMonth && styles.dayNumberDim,
                  isToday(day) && !selected && styles.dayNumberToday,
                  selected && styles.dayNumberSelected,
                ]}
              >
                {format(day, "d")}
              </Text>
              {count > 0 && <View style={[styles.dot, selected && styles.dotSelected]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.divider} />

      <Text style={styles.selectedDayLabel}>{format(selectedDay, "EEEE, MMMM d")}</Text>
      {dayTasks.length === 0 ? (
        <EmptyState icon={CalendarX} title="Nothing scheduled" description="No tasks are due on this day." />
      ) : (
        <ScrollView>
          {dayTasks.map((t) => (
            <TaskRow key={t.id} task={t} onPress={() => onOpenTask(t)} onToggleComplete={() => onToggleComplete(t)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const CELL_SIZE_PCT = 100 / 7;

// Colours depend on the active theme, so styles are built per-theme rather than
// frozen at module load. Layout values are identical to before.
function makeStyles(theme: TaskThemeValue) {
  return StyleSheet.create({
  container: { flex: 1 },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  monthLabel: { fontSize: 15, fontWeight: "700", color: theme.text.primary },
  weekdayRow: { flexDirection: "row", paddingHorizontal: theme.spacing.lg },
  weekdayLabel: { width: `${CELL_SIZE_PCT}%`, textAlign: "center", fontSize: 11, fontWeight: "700", color: theme.text.tertiary },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: theme.spacing.lg, paddingTop: 4 },
  dayCell: { width: `${CELL_SIZE_PCT}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  dayCellSelected: {},
  dayNumber: {
    fontSize: 13,
    color: theme.text.primary,
    fontWeight: "600",
    width: 28,
    height: 28,
    lineHeight: 28,
    textAlign: "center",
    borderRadius: 14,
  },
  dayNumberDim: { color: theme.text.tertiary },
  dayNumberToday: { backgroundColor: theme.bg.surfaceRaised },
  dayNumberSelected: { backgroundColor: theme.accent.primary, color: "#fff" },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.accent.primary },
  dotSelected: { backgroundColor: theme.accent.primary },
  divider: { height: 1, backgroundColor: theme.border.subtle, marginTop: theme.spacing.sm },
  selectedDayLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: theme.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  });
}
