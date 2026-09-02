import React from "react";
import TasksScreenShell from "@/components/tasks/TasksScreenShell";
import * as taskApi from "@/components/tasks/data/taskApi";
import { useTaskCapabilities } from "@/components/tasks/capabilities";
import { Task } from "@/components/tasks/types";
import { useRewards } from "@/contexts/RewardContext";
import { useTaskBlasterContext } from "@/contexts/TaskBlasterContext";

// Manager task-management screen. This used to be a 2,884-line file — its own
// Task/Project types, its own dark palette, a dead hardcoded `visible={false}` duplicate
// detail modal sitting next to the real one, and every mutation copy-pasted from the
// employee screen. Now a thin orchestrator over the same components/tasks/* design
// system the employee and admin portals use; the endpoints called (via
// components/tasks/data/taskApi.ts) are unchanged from what this screen already called.
export default function ManagerTasksScreen() {
  const capabilities = useTaskCapabilities();
  const { triggerReward } = useRewards();
  const { triggerBlaster, incrementCompletedCount } = useTaskBlasterContext();

  const handleTaskCompleted = (task: Task) => {
    triggerReward(200, 350);
    incrementCompletedCount();
    triggerBlaster({ id: task.id, title: task.title, priority: task.priority, status: "completed" });
  };

  return <TasksScreenShell api={taskApi} capabilities={capabilities} headerTitle="Tasks" onTaskCompleted={handleTaskCompleted} />;
}
