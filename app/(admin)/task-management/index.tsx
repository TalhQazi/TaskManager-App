import React from "react";
import TasksScreenShell from "@/components/tasks/TasksScreenShell";
import * as adminTaskApi from "@/components/tasks/data/adminTaskApi";
import { useTaskCapabilities } from "@/components/tasks/capabilities";
import { Task } from "@/components/tasks/types";
import { useRewards } from "@/contexts/RewardProvider";

// Admin task-management screen. This used to be a 1,263-line file with its own,
// narrower Task/Project shape (teamLead/projectName/code, no subtasks), a task detail
// modal with literal hardcoded placeholder text for due date/assignee instead of real
// task data, and a comment box that only ever wrote to local state — nothing was ever
// sent to the server. Now a thin orchestrator over the same components/tasks/* design
// system as the employee/manager portals: real task data throughout, and comments now
// persist via the same /api/tasks/:id/comments endpoint lib/admin/apiClient.ts already
// exposed (addTaskComment/getTaskComments) but this screen never called.
//
// Admin keeps its own reward-trigger import (contexts/RewardProvider, not
// contexts/RewardContext) exactly as this screen already used — that dual reward-system
// wiring predates this redesign and is left untouched here.
export default function AdminTaskManagementScreen() {
  const capabilities = useTaskCapabilities();
  const { triggerReward } = useRewards();

  const handleTaskCompleted = (_task: Task) => {
    triggerReward(200, 350);
  };

  return <TasksScreenShell api={adminTaskApi} capabilities={capabilities} headerTitle="Task Management" onTaskCompleted={handleTaskCompleted} />;
}
