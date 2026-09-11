import React from "react";
import { TaskWorkspaceProvider } from "@/components/task-workspace/TaskWorkspaceContext";
import { TaskWorkspaceShell } from "@/components/task-workspace/TaskWorkspaceShell";

export default function ManagerTaskWorkspaceScreen() {
  return (
    <TaskWorkspaceProvider initialView="card">
      <TaskWorkspaceShell title="Manager Task Workspace" />
    </TaskWorkspaceProvider>
  );
}
