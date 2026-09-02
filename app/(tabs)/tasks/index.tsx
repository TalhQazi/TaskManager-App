import React from "react";
import { useLocalSearchParams } from "expo-router";
import TasksScreenShell from "@/components/tasks/TasksScreenShell";
import * as taskApi from "@/components/tasks/data/taskApi";
import { useTaskCapabilities } from "@/components/tasks/capabilities";
import { Task } from "@/components/tasks/types";
import { useRewards } from "@/contexts/RewardContext";
import { useTaskBlasterContext } from "@/contexts/TaskBlasterContext";

// Employee task-management screen. This used to be a 2,680-line file with its own
// hand-rolled Task/Project types, styles, and every mutation inline — now a thin
// orchestrator over the shared components/tasks/* design system (identical shell to the
// manager and admin portals; only the data-hook module and capabilities differ).
export default function EmployeeTasksScreen() {
  const params = useLocalSearchParams<{ openTaskId?: string | string[] }>();
  const openTaskId = Array.isArray(params.openTaskId) ? params.openTaskId[0] : params.openTaskId;
  const capabilities = useTaskCapabilities();
  const { triggerReward } = useRewards();
  const { triggerBlaster, incrementCompletedCount } = useTaskBlasterContext();

  const handleTaskCompleted = (task: Task) => {
    triggerReward(200, 350);
    incrementCompletedCount();
    triggerBlaster({ id: task.id, title: task.title, priority: task.priority, status: "completed" });
  };

  return (
    <TasksScreenShell
      api={taskApi}
      capabilities={capabilities}
      headerTitle="My Tasks"
      onTaskCompleted={handleTaskCompleted}
      initialTaskId={openTaskId}
    />
  );
}
