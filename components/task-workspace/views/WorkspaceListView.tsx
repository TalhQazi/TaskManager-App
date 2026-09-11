import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useTaskWorkspace } from "../TaskWorkspaceContext";
import { STATUS_COLUMNS, TaskView, useWorkspaceTaskDataset } from "../data/workspaceApi";
import { useTaskTheme } from "@/components/tasks/theme";
import { ViewLoading, ViewEmpty, dueLabel, PriorityBadge, StatusBadge, AvatarStack } from "./shared";

interface WorkspaceListViewProps {
  dense?: boolean;
}

export default function WorkspaceListView({ dense = false }: WorkspaceListViewProps) {
  const theme = useTaskTheme();
  const { filters, setFilters, setSelectedTask, setIsCreateOpen } = useTaskWorkspace();
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useWorkspaceTaskDataset(filters);

  const tasks: TaskView[] = React.useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data]);

  if (isLoading) return <ViewLoading />;
  if (!tasks.length) {
    return (
      <ViewEmpty
        label="No tasks found matching your filters."
        actionLabel="Create Task"
        onAction={() => setIsCreateOpen(true)}
      />
    );
  }

  const renderItem = ({ item }: { item: TaskView }) => {
    const statusCol = STATUS_COLUMNS.find((s) => s.key === item.status) || STATUS_COLUMNS[0];
    const due = dueLabel(item.dueDate);

    return (
      <TouchableOpacity
        style={[
          styles.row,
          dense ? styles.denseRow : styles.normalRow,
          {
            backgroundColor: theme.bg.surface,
            borderBottomColor: theme.border.subtle,
          },
        ]}
        onPress={() => setSelectedTask(item)}
        activeOpacity={0.7}
      >
        {/* Status Dot */}
        <View style={[styles.statusDot, { backgroundColor: statusCol.color }]} />

        {/* Task Title & Number */}
        <View style={styles.titleColumn}>
          <Text
            style={[
              dense ? styles.denseTitle : styles.normalTitle,
              { color: theme.text.primary },
            ]}
            numberOfLines={1}
          >
            {item.taskNumber ? (
              <Text style={{ color: theme.text.tertiary, fontWeight: "500" }}>
                #{item.taskNumber}{" "}
              </Text>
            ) : null}
            {item.title || "Untitled"}
          </Text>
          {!dense && item.assignees.length > 0 && (
            <Text
              style={[styles.subAssignees, { color: theme.text.tertiary }]}
              numberOfLines={1}
            >
              {item.assignees.join(", ")}
            </Text>
          )}
        </View>

        {/* Assignees (avatars if not dense) */}
        {!dense && (
          <View style={styles.assigneeCol}>
            <AvatarStack
              assignees={item.assignees}
              max={2}
              onPressAssignee={(a) => setFilters({ assignment: a })}
            />
          </View>
        )}

        {/* Due Date */}
        <View style={styles.dueCol}>
          <Text
            style={[
              dense ? styles.denseDueText : styles.dueText,
              { color: due.color },
            ]}
            numberOfLines={1}
          >
            {due.text}
          </Text>
        </View>

        {/* Priority */}
        <View style={styles.priorityCol}>
          <PriorityBadge priority={item.priority} />
        </View>

        {/* Status Pill */}
        {!dense && (
          <View style={styles.statusCol}>
            <StatusBadge status={item.status} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.canvas }]}>
      {/* Table Header */}
      <View
        style={[
          styles.headerRow,
          dense ? styles.denseHeader : styles.normalHeader,
          {
            backgroundColor: theme.bg.surfaceRaised,
            borderBottomColor: theme.border.default,
          },
        ]}
      >
        <View style={styles.headerDotSpace} />
        <Text style={[styles.headerText, styles.titleColumn, { color: theme.text.tertiary }]}>
          TASK
        </Text>
        {!dense && (
          <Text style={[styles.headerText, styles.assigneeCol, { color: theme.text.tertiary }]}>
            ASSIGNEES
          </Text>
        )}
        <Text style={[styles.headerText, styles.dueCol, { color: theme.text.tertiary }]}>
          DUE
        </Text>
        <Text style={[styles.headerText, styles.priorityCol, { color: theme.text.tertiary }]}>
          PRIORITY
        </Text>
        {!dense && (
          <Text style={[styles.headerText, styles.statusCol, { color: theme.text.tertiary }]}>
            STATUS
          </Text>
        )}
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.accent.primary}
          />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={theme.accent.primary} />
              <Text style={[styles.footerText, { color: theme.text.secondary }]}>
                Loading more tasks…
              </Text>
            </View>
          ) : hasNextPage ? (
            <TouchableOpacity
              style={[styles.loadMoreBtn, { borderColor: theme.border.default }]}
              onPress={() => fetchNextPage()}
            >
              <Text style={[styles.loadMoreText, { color: theme.accent.primary }]}>
                Load More Tasks
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  normalHeader: {
    height: 38,
  },
  denseHeader: {
    height: 32,
  },
  headerText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerDotSpace: {
    width: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  normalRow: {
    paddingVertical: 12,
    minHeight: 56,
  },
  denseRow: {
    paddingVertical: 8,
    minHeight: 40,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  titleColumn: {
    flex: 1,
    justifyContent: "center",
  },
  normalTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  denseTitle: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  subAssignees: {
    fontSize: 11,
    marginTop: 2,
  },
  assigneeCol: {
    width: 60,
    alignItems: "center",
  },
  dueCol: {
    width: 72,
    alignItems: "flex-end",
  },
  dueText: {
    fontSize: 12,
    fontWeight: "500",
  },
  denseDueText: {
    fontSize: 11,
    fontWeight: "500",
  },
  priorityCol: {
    width: 64,
    alignItems: "center",
  },
  statusCol: {
    width: 84,
    alignItems: "center",
  },
  footerLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  footerText: {
    fontSize: 12,
  },
  loadMoreBtn: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
