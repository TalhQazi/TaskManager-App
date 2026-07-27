import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { CalendarPlus, PlayCircle, CheckCircle2, Loader2 } from "lucide-react-native";
import Colors from "@/constants/colors";

export interface TaskTimelineData {
  createdAt?: string;
  firstStartedAt?: string | null;
  startedByName?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  completedByName?: string;
  status?: string;
}

function formatDateTime(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

interface Row {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  toneColor: string;
}

export function TaskTimeline({ task }: { task: TaskTimelineData }) {
  const rows: Row[] = [];

  const created = formatDate(task.createdAt);
  if (created) {
    rows.push({
      icon: <CalendarPlus size={16} color="#8b949e" />,
      label: "Created",
      value: created,
      toneColor: "#8b949e",
    });
  }

  const started = formatDateTime(task.firstStartedAt);
  if (started) {
    rows.push({
      icon: <PlayCircle size={16} color="#1f6feb" />,
      label: "Started",
      value: started,
      sub: task.startedByName ? `by ${task.startedByName}` : undefined,
      toneColor: "#1f6feb",
    });
  }

  const completed = formatDateTime(task.completedAt);
  if (completed) {
    rows.push({
      icon: <CheckCircle2 size={16} color="#238636" />,
      label: "Completed",
      value: completed,
      sub: task.completedByName ? `by ${task.completedByName}` : undefined,
      toneColor: "#238636",
    });
  } else if (task.status === "in-progress") {
    const runningSince = formatDateTime(task.startedAt) || started;
    rows.push({
      icon: <Loader2 size={16} color="#d29922" />, // Note: To animate spinning on native, use an Animated wrapper if desired
      label: "In progress",
      value: runningSince ? `since ${runningSince}` : "Currently running",
      toneColor: "#d29922",
    });
  }

  if (rows.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Timeline</Text>
      <View style={styles.listContainer}>
        {rows.map((row, idx) => (
          <View key={idx} style={styles.rowItem}>
            {/* Visual connector lines */}
            <View style={styles.timelineLeftColumn}>
              <View style={[styles.iconIndicator, { borderColor: row.toneColor }]}>
                {row.icon}
              </View>
              {idx !== rows.length - 1 && <View style={styles.verticalTrackLine} />}
            </View>
            
            <View style={styles.rowContent}>
              <View style={styles.labelTextWrapper}>
                <Text style={styles.labelText}>{row.label}</Text>
                <Text style={styles.valueText}>{row.value}</Text>
              </View>
              {row.sub && <Text style={styles.subText}>{row.sub}</Text>}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#161b22",
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#8b949e",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  listContainer: {
    flexDirection: "column",
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineLeftColumn: {
    alignItems: "center",
    marginRight: 12,
  },
  iconIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0d1117",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  verticalTrackLine: {
    width: 2,
    height: 32,
    backgroundColor: "#30363d",
    marginVertical: 2,
  },
  rowContent: {
    flex: 1,
    paddingBottom: 20,
    justifyContent: "center",
  },
  labelTextWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
  },
  labelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
    marginRight: 6,
  },
  valueText: {
    fontSize: 14,
    color: "#c9d1d9",
  },
  subText: {
    fontSize: 12,
    color: "#8b949e",
    marginTop: 2,
  },
});