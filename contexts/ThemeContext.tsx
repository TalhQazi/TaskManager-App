import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/admin/apiClient";

export type ThemePresetId = 
  | "dark-minimal" 
  | "neon-tech" 
  | "metallic-elite" 
  | "executive-black" 
  | "high-contrast" 
  | "energy-mode" 
  | "crystal-white";

export interface CustomColors {
  textColor: string;
  primary: string;
}

export interface PanelColors {
  dashboardBackground: string;
  dashboardCardBackground: string;
  dashboardTextColor: string;
  borderColor: string;
}

export interface UIThemeState {
  theme: ThemePresetId;
  cardStyle: "glass" | "metallic" | "neon" | "flat";
  customColors: CustomColors;
  panelColors: PanelColors;
}

interface ThemeContextType {
  uiTheme: UIThemeState;
  updateTheme: (updates: Partial<Omit<UIThemeState, "panelColors" | "customColors">> & { customColors?: Partial<CustomColors> }) => void;
  resetTheme: () => Promise<void>;
  saveToBackend: (themeState: UIThemeState) => Promise<void>;
}

const THEME_PRESETS: Record<ThemePresetId, PanelColors & { defaultPrimary: string }> = {
  "dark-minimal": {
    dashboardBackground: "#09090b",
    dashboardCardBackground: "#141517",
    dashboardTextColor: "#f8fafc",
    defaultPrimary: "#3b82f6",
  },
  "neon-tech": {
    dashboardBackground: "#090d16",
    dashboardCardBackground: "#111827",
    dashboardTextColor: "#e0f7fa",
    defaultPrimary: "#0ea5e9",
  },
  "metallic-elite": {
    dashboardBackground: "#09090b",
    dashboardCardBackground: "#141517",
    dashboardTextColor: "#ffd27a",
    defaultPrimary: "#7c3aed",
  },
  "executive-black": {
    dashboardBackground: "#000000",
    dashboardCardBackground: "#111111",
    dashboardTextColor: "#f3f4f6",
    defaultPrimary: "#64748b",
  },
  "high-contrast": {
    dashboardBackground: "#000000",
    dashboardCardBackground: "#000000",
    dashboardTextColor: "#ffffff",
    defaultPrimary: "#ffff00",
  },
  "energy-mode": {
    dashboardBackground: "#0a0500",
    dashboardCardBackground: "#1c120c",
    dashboardTextColor: "#ffedd5",
    defaultPrimary: "#f97316",
  },
  "crystal-white": {
    dashboardBackground: "#ffffff",
    dashboardCardBackground: "#f8fafc",
    dashboardTextColor: "#000000",
    defaultPrimary: "#133767",
  },
};

const DEFAULT_THEME_STATE: UIThemeState = {
  theme: "dark-minimal",
  cardStyle: "glass",
  customColors: {
    textColor: "#f8fafc",
    primary: "#3b82f6",
  },
  panelColors: {
    dashboardBackground: "#09090b",
    dashboardCardBackground: "#141517",
    dashboardTextColor: "#f8fafc",
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [uiTheme, setUiTheme] = useState<UIThemeState>(DEFAULT_THEME_STATE);

  const computeThemeState = useCallback((themeId: ThemePresetId, cardStyle: UIThemeState["cardStyle"], customTextColor?: string, customPanelColors?: Partial<PanelColors>): UIThemeState => {
    const preset = THEME_PRESETS[themeId] || THEME_PRESETS["dark-minimal"];
    const textColors = customTextColor || customPanelColors?.dashboardTextColor || preset.dashboardTextColor;

    return {
      theme: themeId,
      cardStyle,
      customColors: {
        textColor: textColors,
        primary: preset.defaultPrimary,
      },
      panelColors: {
        dashboardBackground: customPanelColors?.dashboardBackground || preset.dashboardBackground,
        dashboardCardBackground: customPanelColors?.dashboardCardBackground || preset.dashboardCardBackground,
        dashboardTextColor: textColors,
      },
    };
  }, []);

  useEffect(() => {
    const loadStoredCloudTheme = async () => {
      try {
        const response = await apiFetch<{ item?: any }>("/api/ui-preferences");
        if (response && response.item) {
          const item = response.item;
          const resolvedState = computeThemeState(
            item.theme || "dark-minimal", 
            item.cardStyle || "glass", 
            item.customColors?.textColor,
            item.panelColors
          );
          setUiTheme(resolvedState);
        }
      } catch (error) {
        console.log("[ThemeContext] Initialization failure bypassed.");
      }
    };

    loadStoredCloudTheme();
  }, [computeThemeState]);

  const updateTheme = useCallback((updates: Partial<Omit<UIThemeState, "panelColors" | "customColors">> & { customColors?: Partial<CustomColors> }) => {
    setUiTheme((current) => {
      const targetTheme = updates.theme !== undefined ? updates.theme : current.theme;
      const targetCardStyle = updates.cardStyle !== undefined ? updates.cardStyle : current.cardStyle;
      const targetTextColor = updates.customColors?.textColor !== undefined 
        ? updates.customColors.textColor 
        : (updates.theme !== undefined ? THEME_PRESETS[updates.theme].dashboardTextColor : current.customColors.textColor);

      return computeThemeState(targetTheme, targetCardStyle, targetTextColor);
    });
  }, [computeThemeState]);

  const saveToBackend = async (targetThemeState: UIThemeState) => {
    try {
      await apiFetch("/api/ui-preferences", {
        method: "PUT",
        body: JSON.stringify({
          theme: targetThemeState.theme,
          cardStyle: targetThemeState.cardStyle,
          customColors: {
            textColor: targetThemeState.customColors.textColor,
            primary: targetThemeState.customColors.primary
          },
          panelColors: {
            dashboardBackground: targetThemeState.panelColors.dashboardBackground,
            dashboardCardBackground: targetThemeState.panelColors.dashboardCardBackground,
            dashboardTextColor: targetThemeState.panelColors.dashboardTextColor,
          }
        }),
      });
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const resetTheme = async () => {
    try {
      const res = await apiFetch<{ item?: any }>("/api/ui-preferences/reset", {
        method: "POST",
      });
      if (res && res.item) {
        const item = res.item;
        const theme = (item.theme || "dark-minimal") as ThemePresetId;
        const cardStyle = (item.cardStyle || "glass") as UIThemeState["cardStyle"];
        const textColor = item.customColors?.textColor || THEME_PRESETS[theme].dashboardTextColor;
        
        setUiTheme(computeThemeState(theme, cardStyle, textColor, item.panelColors));
      } else {
        setUiTheme(DEFAULT_THEME_STATE);
      }
    } catch (e) {
      setUiTheme(DEFAULT_THEME_STATE);
    }
  };

  const contextValue = useMemo(() => ({
    uiTheme,
    updateTheme,
    resetTheme,
    saveToBackend
  }), [uiTheme, updateTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within an explicit ThemeProvider container instance.");
  }
  return context;
}