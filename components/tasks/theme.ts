// Design tokens for the unified task-management UI.
import { useTheme } from "@/contexts/ThemeContext";
import { isDarkTheme } from "@/constants/design/presets";
import { isDarkColor } from "@/constants/design/tokens";

export const taskTheme = {
  bg: {
    canvas: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceRaised: "#F1F5F9",
    surfaceHover: "#E2E8F0",
    inset: "#F1F5F9",
  },
  border: {
    default: "#E2E8F0",
    subtle: "#F1F5F9",
    focus: "#2563EB",
  },
  text: {
    primary: "#0F172A",
    secondary: "#475569",
    tertiary: "#64748B",
    inverse: "#FFFFFF",
    onAccent: "#FFFFFF",
  },
  accent: {
    primary: "#2563EB",
    primarySoft: "rgba(37,99,235,0.12)",
    success: "#10B981",
    successSoft: "rgba(16,185,129,0.12)",
    warning: "#F59E0B",
    warningSoft: "rgba(245,158,11,0.12)",
    danger: "#EF4444",
    dangerSoft: "rgba(239,68,68,0.12)",
  },
  priority: {
    urgent: { fg: "#EF4444", bg: "#FEE2E2", label: "Urgent" },
    high: { fg: "#EF4444", bg: "#FEE2E2", label: "High" },
    medium: { fg: "#D97706", bg: "#FEF3C7", label: "Medium" },
    low: { fg: "#64748B", bg: "#F1F5F9", label: "Low" },
  },
  status: {
    pending: { fg: "#64748B", bg: "#F1F5F9", label: "Pending" },
    "in-progress": { fg: "#2563EB", bg: "#EFF6FF", label: "In Progress" },
    completed: { fg: "#10B981", bg: "#D1FAE5", label: "Completed" },
    overdue: { fg: "#EF4444", bg: "#FEE2E2", label: "Overdue" },
  },
  radius: { sm: 6, md: 10, lg: 14, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
} as const;

export type TaskTheme = typeof taskTheme;

export function useTaskTheme() {
  const themeContext = useTheme() as any;
  const uiTheme = themeContext?.uiTheme;
  const primary = uiTheme?.customColors?.primary || "#2563EB";

  const bgRaw = uiTheme?.panelColors?.dashboardBackground;

  // Light/dark is decided by the background actually being painted, not by the preset's
  // declared scheme. The theme engine lets those diverge — keep a dark preset (and its
  // accent) but override the dashboard background to something light — and trusting the
  // preset id there rendered white text on a near-white canvas, making titles, task
  // names and inactive tabs invisible. Fall back to the preset only when no override
  // is set or the override isn't a parseable colour.
  const isDark = isDarkColor(bgRaw, isDarkTheme(uiTheme?.theme));

  return {
    isDark,
    bg: {
      canvas: bgRaw || (isDark ? "#0B0F17" : "#F8FAFC"),
      surface: isDark ? (uiTheme?.panelColors?.dashboardCardBackground || "#131B2E") : "#FFFFFF",
      surfaceRaised: isDark ? "#1E293B" : "#F8FAFC",
      surfaceHover: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9",
      inset: isDark ? "#080C14" : "#F1F5F9",
      card: isDark ? (uiTheme?.panelColors?.dashboardCardBackground || "#131B2E") : "#FFFFFF",
    },
    border: {
      default: isDark ? "rgba(255,255,255,0.12)" : "#E2E8F0",
      subtle: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9",
      focus: primary,
    },
    text: {
      primary: isDark ? "#F8FAFC" : "#0F172A",
      secondary: isDark ? "#94A3B8" : "#475569",
      tertiary: isDark ? "#64748B" : "#64748B",
      inverse: isDark ? "#0F172A" : "#FFFFFF",
      onAccent: "#FFFFFF",
    },
    accent: {
      primary: primary,
      primarySoft: isDark ? "rgba(37,99,235,0.22)" : "#EFF6FF",
      success: "#10B981",
      successSoft: isDark ? "rgba(16,185,129,0.22)" : "#D1FAE5",
      warning: "#F59E0B",
      warningSoft: isDark ? "rgba(245,158,11,0.22)" : "#FEF3C7",
      danger: "#EF4444",
      dangerSoft: isDark ? "rgba(239,68,68,0.22)" : "#FEE2E2",
    },
    priority: {
      urgent: { fg: "#EF4444", bg: isDark ? "rgba(239,68,68,0.25)" : "#FEE2E2", label: "Urgent" },
      high: { fg: "#EF4444", bg: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2", label: "High" },
      medium: { fg: isDark ? "#FBBF24" : "#D97706", bg: isDark ? "rgba(245,158,11,0.2)" : "#FEF3C7", label: "Medium" },
      low: { fg: isDark ? "#94A3B8" : "#64748B", bg: isDark ? "rgba(148,163,184,0.2)" : "#F1F5F9", label: "Low" },
    },
    status: {
      pending: { fg: isDark ? "#94A3B8" : "#64748B", bg: isDark ? "rgba(148,163,184,0.2)" : "#F1F5F9", label: "Pending" },
      "in-progress": { fg: "#3B82F6", bg: isDark ? "rgba(59,130,246,0.2)" : "#EFF6FF", label: "In Progress" },
      completed: { fg: "#10B981", bg: isDark ? "rgba(16,185,129,0.2)" : "#D1FAE5", label: "Completed" },
      overdue: { fg: "#EF4444", bg: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2", label: "Overdue" },
    },
    radius: { sm: 6, md: 10, lg: 14, pill: 999 },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  };
}

/** Live theme value returned by useTaskTheme — the type styles factories accept. */
export type TaskThemeValue = ReturnType<typeof useTaskTheme>;
