import React from "react";
import { TaskWorkspaceProvider } from "@/components/task-workspace/TaskWorkspaceContext";
import { TaskWorkspaceShell } from "@/components/task-workspace/TaskWorkspaceShell";

export default function AdminTaskWorkspaceScreen() {
  return (
    <TaskWorkspaceProvider initialView="card">
      <TaskWorkspaceShell title="Admin Task Workspace" />
    </TaskWorkspaceProvider>
  );
}
