export function getRemainingTime(dueDate?: string, now?: number) {
  if (!dueDate) return null;

  const current = now || Date.now();

  const diff = new Date(dueDate).getTime() - current;

  const isOverdue = diff < 0;
  const abs = Math.abs(diff);

  const days = Math.floor(abs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((abs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((abs / (1000 * 60)) % 60);
  const seconds = Math.floor((abs / 1000) % 60);

  return {
    isOverdue,
    totalMs: diff,
    formatted: `${isOverdue ? "-" : ""}${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
  };
}

export function getTimerState(ms: number) {
  if (ms <= 0) return "overdue";
  if (ms <= 60 * 60 * 1000) return "critical";
  if (ms <= 24 * 60 * 60 * 1000) return "warning";

  return "normal";
}