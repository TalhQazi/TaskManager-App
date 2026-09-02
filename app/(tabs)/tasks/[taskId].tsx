import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { taskTheme } from "@/components/tasks/theme";

// This route used to be a full 1,091-line screen with its own Task type whose `status`
// union (`pending`/`in_progress`/`completed`) didn't match the real data shape used by
// the task list (`pending`/`in-progress`/`completed`/`overdue`) — it no longer rendered
// task state correctly. Notifications and deep links that land here now redirect into
// the unified Tasks screen with that task's detail drawer opened, instead of a second,
// drifted implementation of the same UI.
export default function TaskDetailRedirect() {
  const params = useLocalSearchParams<{ taskId?: string | string[] }>();
  const taskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;
  const router = useRouter();

  useEffect(() => {
    router.replace({ pathname: "/(tabs)/tasks", params: taskId ? { openTaskId: taskId } : undefined } as any);
  }, [taskId, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={taskTheme.accent.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: taskTheme.bg.canvas },
});
