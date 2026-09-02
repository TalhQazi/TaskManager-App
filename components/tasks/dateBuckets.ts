import {
  isToday,
  isTomorrow,
  isThisWeek,
  isPast,
  isValid,
  parseISO,
  differenceInCalendarDays,
  format,
} from "date-fns";
import { Task, TaskBucket } from "./types";

export function parseDue(task: Task): Date | null {
  const raw = task?.dueDate || (task as any)?.due_date || (task as any)?.deadline || (task as any)?.targetDate;
  if (!raw) return null;
  try {
    const d = typeof raw === "string" ? parseISO(raw) : new Date(raw);
    if (isValid(d) && !isNaN(d.getTime())) return d;
    const fallback = new Date(raw);
    return isValid(fallback) && !isNaN(fallback.getTime()) ? fallback : null;
  } catch {
    return null;
  }
}

// Buckets a task into Overdue / Today / Tomorrow / This Week / Next Week / Later / No date.
export function bucketForTask(task: Task, now: Date = new Date()): TaskBucket {
  const due = parseDue(task);
  if (!due) return "no-date";
  if (task.status !== "completed" && isPast(due) && !isToday(due)) return "overdue";
  if (isToday(due)) return "today";
  if (isTomorrow(due)) return "tomorrow";
  if (isThisWeek(due, { weekStartsOn: 1 })) return "this-week";
  const daysOut = differenceInCalendarDays(due, now);
  if (daysOut <= 13) return "next-week";
  return "later";
}

export const BUCKET_LABEL: Record<TaskBucket, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  "this-week": "This Week",
  "next-week": "Next Week",
  later: "Later",
  "no-date": "No Date",
};

export function isDueOnOrBeforeToday(task: Task, now: Date = new Date()): boolean {
  const due = parseDue(task);
  if (!due) return false;
  return isToday(due) || (isPast(due) && task.status !== "completed");
}

export function formatDueLabel(task: Task): string | null {
  const due = parseDue(task);
  if (!due) return null;
  if (isToday(due)) return "Today";
  if (isTomorrow(due)) return "Tomorrow";
  const overdue = task.status !== "completed" && isPast(due) && !isToday(due);
  return overdue ? `Overdue · ${format(due, "MMM d")}` : format(due, "MMM d");
}
