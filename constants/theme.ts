export const THEME_DEFAULTS: Record<string, string> = {
  "dark-minimal": "#f8fafc",
  "neon-tech": "#e0f7fa",
  "metallic-elite": "#d4af37",
  "executive-black": "#f3f4f6",
  "high-contrast": "#ffffff",
  "energy-mode": "#ffedd5",
  "crystal-white": "#000000",
};

export const THEME_PRESETS: Record<string, {
  primary: string;
  secondary: string;
  accent: string;
  headerBg: string;
  sidebarBg: string;
  dashboardBg: string;
  cardBg: string;
  sidebarIcon: string;
  dashboardIcon: string;
  sidebarText: string;
  glowIntensity: number;
}> = {
  "dark-minimal": {
    primary: "#133767", secondary: "#3b82f6", accent: "#8b5cf6",
    headerBg: "#133767", sidebarBg: "#020617", dashboardBg: "#0f172a",
    cardBg: "rgba(30, 41, 59, 0.7)", sidebarIcon: "#ffffff", dashboardIcon: "#3b82f6", sidebarText: "#ffffff",
    glowIntensity: 50,
  },
  "neon-tech": {
    primary: "#00f5ff", secondary: "#00c6ff", accent: "#8b5cf6",
    headerBg: "#030014", sidebarBg: "#06061a", dashboardBg: "#030014",
    cardBg: "rgba(0, 245, 255, 0.03)", sidebarIcon: "#e0f7fa", dashboardIcon: "#00f5ff", sidebarText: "#e0f7fa",
    glowIntensity: 60,
  },
  "metallic-elite": {
    primary: "#d4af37", secondary: "#c0a030", accent: "#e8c84e",
    headerBg: "#1a1a1a", sidebarBg: "rgba(17, 17, 17, 0.8)", dashboardBg: "#1a1a1a",
    cardBg: "#2a2a2a", 
    sidebarIcon: "#d4af37", dashboardIcon: "#d4af37", sidebarText: "#d4af37",
    glowIntensity: 55,
  },
  "executive-black": {
    primary: "#f3f4f6", secondary: "#d1d5db", accent: "#9ca3af",
    headerBg: "#0a0a0a", sidebarBg: "#050505", dashboardBg: "#0a0a0a",
    cardBg: "rgba(20, 20, 20, 0.8)", sidebarIcon: "#f3f4f6", dashboardIcon: "#f3f4f6", sidebarText: "#f3f4f6",
    glowIntensity: 40,
  },
  "high-contrast": {
    primary: "#ffffff", secondary: "#ffffff", accent: "#ffff00",
    headerBg: "#000000", sidebarBg: "#000000", dashboardBg: "#000000",
    cardBg: "#000000", sidebarIcon: "#ffffff", dashboardIcon: "#ffffff", sidebarText: "#ffffff",
    glowIntensity: 80,
  },
  "energy-mode": {
    primary: "#ffedd5", secondary: "#fdba74", accent: "#fb923c",
    headerBg: "#1a0f00", sidebarBg: "#0a0500", dashboardBg: "#1a0f00",
    cardBg: "rgba(255, 150, 0, 0.1)", sidebarIcon: "#ffedd5", dashboardIcon: "#ffedd5", sidebarText: "#ffedd5",
    glowIntensity: 50,
  },
  "crystal-white": {
    primary: "#133767", secondary: "#3b82f6", accent: "#8b5cf6",
    headerBg: "#f8fafc", sidebarBg: "#ffffff", dashboardBg: "#f8fafc",
    cardBg: "#ffffff", sidebarIcon: "#000000", dashboardIcon: "#133767", sidebarText: "#000000",
    glowIntensity: 30,
  },
};