import { createContext, useContext, useState, useEffect } from "react";

export const themeDefaults: Record<string, string> = {
  "dark-minimal": "#f8fafc",
  "neon-tech": "#e0f7fa",
  "metallic-elite": "#d4af37",
  "executive-black": "#f3f4f6",
  "high-contrast": "#ffffff",
  "energy-mode": "#ffedd5",
  "crystal-white": "#000000",
};

export interface ThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  headerBg: string;
  sidebarBg: string;
  dashboardBg: string;
  cardBg: string; // Solid fallback color
  cardGradient?: string[]; // Extracted clean string arrays for Expo LinearGradient
  sidebarIcon: string;
  dashboardIcon: string;
  sidebarText: string;
  glowIntensity: number;
  animationSpeedMs: number; // Converted from CSS transition speeds to ms for native drivers
  textColor: string;
  textMuted: string;
  cardStyle: string;
}

export const themePresets: Record<string, Omit<ThemeConfig, "textColor" | "textMuted" | "cardStyle">> = {
  "dark-minimal": {
    primary: "#133767", secondary: "#3b82f6", accent: "#8b5cf6",
    headerBg: "#133767", sidebarBg: "#020617", dashboardBg: "#0f172a",
    cardBg: "#1e293b", cardGradient: ["#1e293b", "#0f172a"],
    sidebarIcon: "#ffffff", dashboardIcon: "#3b82f6", sidebarText: "#ffffff",
    glowIntensity: 50, animationSpeedMs: 300,
  },
  "neon-tech": {
    primary: "#00f5ff", secondary: "#00c6ff", accent: "#8b5cf6",
    headerBg: "#030014", sidebarBg: "#06061a", dashboardBg: "#030014",
    cardBg: "#06061a", cardGradient: ["#030014", "#06061a"],
    sidebarIcon: "#e0f7fa", dashboardIcon: "#00f5ff", sidebarText: "#e0f7fa",
    glowIntensity: 60, animationSpeedMs: 300,
  },
  "metallic-elite": {
    primary: "#d4af37", secondary: "#c0a030", accent: "#e8c84e",
    headerBg: "#1a1a1a", sidebarBg: "#111111", dashboardBg: "#1a1a1a",
    cardBg: "#2a2a2a", cardGradient: ["#2a2a2a", "#1a1a1a"], 
    sidebarIcon: "#d4af37", dashboardIcon: "#d4af37", sidebarText: "#d4af37",
    glowIntensity: 55, animationSpeedMs: 300,
  },
  "executive-black": {
    primary: "#f3f4f6", secondary: "#d1d5db", accent: "#9ca3af",
    headerBg: "#0a0a0a", sidebarBg: "#050505", dashboardBg: "#0a0a0a",
    cardBg: "#141414",
    sidebarIcon: "#f3f4f6", dashboardIcon: "#f3f4f6", sidebarText: "#f3f4f6",
    glowIntensity: 40, animationSpeedMs: 300,
  },
  "high-contrast": {
    primary: "#ffffff", secondary: "#ffffff", accent: "#ffff00",
    headerBg: "#000000", sidebarBg: "#000000", dashboardBg: "#000000",
    cardBg: "#000000",
    sidebarIcon: "#ffffff", dashboardIcon: "#ffffff", sidebarText: "#ffffff",
    glowIntensity: 80, animationSpeedMs: 150,
  },
  "energy-mode": {
    primary: "#ffedd5", secondary: "#fdba74", accent: "#fb923c",
    headerBg: "#1a0f00", sidebarBg: "#0a0500", dashboardBg: "#1a0f00",
    cardBg: "#1a0f00", cardGradient: ["rgba(255, 150, 0, 0.1)", "transparent"],
    sidebarIcon: "#ffedd5", dashboardIcon: "#ffedd5", sidebarText: "#ffedd5",
    glowIntensity: 50, animationSpeedMs: 300,
  },
  "crystal-white": {
    primary: "#133767", secondary: "#3b82f6", accent: "#8b5cf6",
    headerBg: "#f8fafc", sidebarBg: "#ffffff", dashboardBg: "#f8fafc",
    cardBg: "#ffffff",
    sidebarIcon: "#000000", dashboardIcon: "#133767", sidebarText: "#000000",
    glowIntensity: 30, animationSpeedMs: 300,
  },
};

// --- Imperative Listener System Bridge ---
type ThemeChangeListener = (theme: ThemeConfig) => void;
const listeners = new Set<ThemeChangeListener>();

let currentActiveRuntimeTheme: ThemeConfig = {
  ...themePresets["dark-minimal"],
  textColor: themeDefaults["dark-minimal"],
  textMuted: "#94a3b8",
  cardStyle: "glass",
};

/**
 * Imperative side-effect engine mimicking global document theme mutation pipelines.
 * Safe to call from anywhere inside API utilities, layout nodes, or background runtimes.
 */
export function applyFullTheme(theme: string, textColor?: string, cardStyle: string = "glass") {
  const preset = themePresets[theme] || themePresets["dark-minimal"];
  const resolvedText = textColor || themeDefaults[theme] || "#ffffff";
  const resolvedMutedText = resolvedText === "#000000" ? "#64748b" : "#94a3b8";

  currentActiveRuntimeTheme = {
    ...preset,
    textColor: resolvedText,
    textMuted: resolvedMutedText,
    cardStyle: cardStyle,
  };

  // Broadcast configurations out to all subscribed reactive context views
  listeners.forEach((listener) => listener(currentActiveRuntimeTheme));
}

// --- React Native Context State Architecture ---
const ThemeEngineContext = createContext<ThemeConfig>(currentActiveRuntimeTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(currentActiveRuntimeTheme);

  useEffect(() => {
    const handleGlobalUpdate: ThemeChangeListener = (nextTheme) => {
      setTheme(nextTheme);
    };

    listeners.add(handleGlobalUpdate);
    return () => {
      listeners.delete(handleGlobalUpdate);
    };
  }, []);

  return (
    <ThemeEngineContext.Provider value={theme}>
      {children}
    </ThemeEngineContext.Provider>
  );
}

/**
 * Hook for consuming runtime parameters directly inside styled native layouts
 */
export const useTheme = () => useContext(ThemeEngineContext);