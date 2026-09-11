import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useTaskWorkspace } from "../TaskWorkspaceContext";
import { STATUS_COLUMNS, TaskView, useWorkspaceTaskDataset } from "../data/workspaceApi";
import { useTaskTheme } from "@/components/tasks/theme";
import { ViewLoading, ViewEmpty, dueLabel, PriorityBadge, AvatarStack } from "./shared";

export default function WorkspaceCardView() {
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
          styles.card,
          {
            backgroundColor: theme.bg.surface,
            borderColor: theme.border.default,
            borderTopColor: statusCol.color,
          },
        ]}
        onPress={() => setSelectedTask(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text
            style={[styles.cardTitle, { color: theme.text.primary }]}
            numberOfLines={2}
          >
            {item.taskNumber ? `#${item.taskNumber} ` : ""}
            {item.title || "Untitled"}
          </Text>
          <PriorityBadge priority={item.priority} />
        </View>

        {!!item.description && (
          <Text
            style={[styles.cardDesc, { color: theme.text.secondary }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <Text style={[styles.dueText, { color: due.color }]}>{due.text}</Text>
          <AvatarStack
            assignees={item.assignees}
            onPressAssignee={(a) => setFilters({ assignment: a })}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
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
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 12,
    gap: 10,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderTopWidth: 3.5,
    padding: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 4,
  },
  dueText: {
    fontSize: 12,
    fontWeight: "500",
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
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
