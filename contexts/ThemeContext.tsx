import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "@/lib/admin/apiClient";
import { PRESETS, DEFAULT_PRESET_ID, resolvePreset, type ThemePresetId } from "@/constants/design/presets";
import { buildTokens, isDarkColor, contrastRatio, type Tokens } from "@/constants/design/tokens";

// Preset definitions now live in constants/design/presets.ts so the token system and the
// theme engine can't drift apart. This context keeps its original public shape —
// `uiTheme` is consumed by ~188 screens and its structure is deliberately unchanged —
// and adds `tokens`, the derived semantic set that components/ui/* is built on.
export type { ThemePresetId };

export interface CustomColors {
  textColor: string;
  primary: string;
}

export interface PanelColors {
  dashboardBackground: string;
  dashboardCardBackground: string;
  dashboardTextColor: string;
  borderColor?: string;
}

export interface UIThemeState {
  theme: ThemePresetId;
  cardStyle: "glass" | "metallic" | "neon" | "flat";
  customColors: CustomColors;
  panelColors: PanelColors;
}

export interface ThemeContextType {
  uiTheme: UIThemeState;
  isDark: boolean;
  /** Derived semantic tokens for the active preset. Prefer this over raw panelColors. */
  tokens: Tokens;
  updateTheme: (updates: Partial<Omit<UIThemeState, "panelColors" | "customColors">> & { customColors?: Partial<CustomColors> }) => void;
  resetTheme: () => Promise<void>;
  saveToBackend: (themeState: UIThemeState) => Promise<void>;
}

const ASYNC_STORAGE_THEME_KEY = "@app_ui_theme_cache";

/** Legacy-shaped view of the preset registry, kept so panelColors stays byte-identical in meaning. */
const PANEL_PRESETS: Record<ThemePresetId, PanelColors & { defaultPrimary: string }> = Object.fromEntries(
  Object.values(PRESETS).map((p) => [
    p.id,
    {
      dashboardBackground: p.canvas,
      dashboardCardBackground: p.surface,
      dashboardTextColor: p.text,
      borderColor: p.border,
      defaultPrimary: p.primary,
    },
  ])
) as Record<ThemePresetId, PanelColors & { defaultPrimary: string }>;

const DEFAULT_PRESET = PRESETS[DEFAULT_PRESET_ID];

const DEFAULT_THEME_STATE: UIThemeState = {
  theme: DEFAULT_PRESET_ID,
  cardStyle: "flat",
  customColors: {
    textColor: DEFAULT_PRESET.text,
    primary: DEFAULT_PRESET.primary,
  },
  panelColors: {
    dashboardBackground: DEFAULT_PRESET.canvas,
    dashboardCardBackground: DEFAULT_PRESET.surface,
    dashboardTextColor: DEFAULT_PRESET.text,
    borderColor: DEFAULT_PRESET.border,
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [uiTheme, setUiTheme] = useState<UIThemeState>(DEFAULT_THEME_STATE);

  const computeThemeState = useCallback((
    themeId: ThemePresetId,
    cardStyle: UIThemeState["cardStyle"],
    customTextColor?: string,
    customPanelColors?: Partial<PanelColors>
  ): UIThemeState => {
    const preset = PANEL_PRESETS[themeId] || PANEL_PRESETS[DEFAULT_PRESET_ID];
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
        borderColor: customPanelColors?.borderColor || preset.borderColor,
      },
    };
  }, []);

  // Automatic Instant Hydration + Background Cloud Sync
  useEffect(() => {
    let isMounted = true;

    const loadAppTheme = async () => {
      // 1. Instant local cache load
      try {
        const cachedTheme = await AsyncStorage.getItem(ASYNC_STORAGE_THEME_KEY);
        if (cachedTheme && isMounted) {
          setUiTheme(JSON.parse(cachedTheme));
        }
      } catch (err) {
        console.log("[ThemeContext] Cache hydration bypassed:", err);
      }

      // 2. Background sync with backend API
      try {
        const response = await apiFetch<{ item?: any }>("/api/ui-preferences");
        if (response && response.item && isMounted) {
          const item = response.item;
          const resolvedState = computeThemeState(
            resolvePreset(item.theme).id,
            item.cardStyle || "flat",
            item.customColors?.textColor,
            item.panelColors
          );

          setUiTheme(resolvedState);
          await AsyncStorage.setItem(ASYNC_STORAGE_THEME_KEY, JSON.stringify(resolvedState));
        }
      } catch (error) {
        console.log("[ThemeContext] Server fetch bypassed, maintaining cached state.");
      }
    };

    loadAppTheme();

    return () => {
      isMounted = false;
    };
  }, [computeThemeState]);

  const updateTheme = useCallback((
    updates: Partial<Omit<UIThemeState, "panelColors" | "customColors">> & { customColors?: Partial<CustomColors> }
  ) => {
    setUiTheme((current) => {
      const targetTheme = updates.theme !== undefined ? updates.theme : current.theme;
      const targetCardStyle = updates.cardStyle !== undefined ? updates.cardStyle : current.cardStyle;
      const targetTextColor = updates.customColors?.textColor !== undefined
        ? updates.customColors.textColor
        : (updates.theme !== undefined ? PANEL_PRESETS[updates.theme].dashboardTextColor : current.customColors.textColor);

      const nextState = computeThemeState(targetTheme, targetCardStyle, targetTextColor);

      // Save locally to cache on change
      AsyncStorage.setItem(ASYNC_STORAGE_THEME_KEY, JSON.stringify(nextState)).catch(() => {});
      return nextState;
    });
  }, [computeThemeState]);

  const saveToBackend = useCallback(async (targetThemeState: UIThemeState) => {
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

      // Mirror to local cache
      await AsyncStorage.setItem(ASYNC_STORAGE_THEME_KEY, JSON.stringify(targetThemeState));
    } catch (e) {
      console.error(e);
      throw e;
    }
  }, []);

  const resetTheme = useCallback(async () => {
    try {
      const res = await apiFetch<{ item?: any }>("/api/ui-preferences/reset", {
        method: "POST",
      });

      let nextState = DEFAULT_THEME_STATE;
      if (res && res.item) {
        const item = res.item;
        const theme = resolvePreset(item.theme).id;
        const cardStyle = (item.cardStyle || "flat") as UIThemeState["cardStyle"];
        const textColor = item.customColors?.textColor || PANEL_PRESETS[theme].dashboardTextColor;

        nextState = computeThemeState(theme, cardStyle, textColor, item.panelColors);
      }

      setUiTheme(nextState);
      await AsyncStorage.setItem(ASYNC_STORAGE_THEME_KEY, JSON.stringify(nextState));
    } catch (e) {
      setUiTheme(DEFAULT_THEME_STATE);
      await AsyncStorage.setItem(ASYNC_STORAGE_THEME_KEY, JSON.stringify(DEFAULT_THEME_STATE));
    }
  }, [computeThemeState]);

  // Previously hardcoded as `theme !== "crystal-white"`, which mislabelled every new
  // light preset as dark. Now driven by the preset's declared scheme.
  const preset = resolvePreset(uiTheme?.theme);
  const isDark = preset.scheme === "dark";

  // Honour user-customised panel colours: if someone overrode the background or text in
  // the theme engine, tokens derive from those overrides rather than the pristine preset.
  const tokens = useMemo(
    () => {
      const canvas = uiTheme?.panelColors?.dashboardBackground || preset.canvas;
      const surface = uiTheme?.panelColors?.dashboardCardBackground || preset.surface;

      // The preset's declared scheme is only a default. A user can keep a dark preset and
      // override the dashboard background to something light, at which point the preset
      // says "dark" while the pixels say "light" — and every derived text colour comes out
      // unreadable. Ask the painted colour instead.
      const scheme = isDarkColor(canvas, preset.scheme === "dark") ? "dark" : "light";

      // Same reasoning for text: only trust the preset's text colour when it still
      // contrasts with the surface it lands on. Otherwise pick the readable end.
      const overriddenText = uiTheme?.panelColors?.dashboardTextColor;
      const text =
        overriddenText ||
        (contrastRatio(preset.text, surface) >= 4.5
          ? preset.text
          : scheme === "dark"
            ? "#F8FAFC"
            : "#111827");

      return buildTokens({
        scheme,
        canvas,
        surface,
        primary: uiTheme?.customColors?.primary || preset.primary,
        text,
        border: uiTheme?.panelColors?.borderColor || preset.border,
      });
    },
    [
      preset,
      uiTheme?.panelColors?.dashboardBackground,
      uiTheme?.panelColors?.dashboardCardBackground,
      uiTheme?.panelColors?.dashboardTextColor,
      uiTheme?.panelColors?.borderColor,
      uiTheme?.customColors?.primary,
    ]
  );

  const contextValue = useMemo(() => ({
    uiTheme,
    isDark,
    tokens,
    updateTheme,
    resetTheme,
    saveToBackend
  }), [uiTheme, isDark, tokens, updateTheme, resetTheme, saveToBackend]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

const DEFAULT_FALLBACK_CONTEXT: ThemeContextType = {
  uiTheme: DEFAULT_THEME_STATE,
  isDark: DEFAULT_PRESET.scheme === "dark",
  tokens: buildTokens(DEFAULT_PRESET),
  updateTheme: () => {},
  resetTheme: async () => {},
  saveToBackend: async () => {},
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    return DEFAULT_FALLBACK_CONTEXT;
  }
  return context;
}

/** Convenience hook for the common case — components that only need tokens. */
export function useTokens(): Tokens {
  return useTheme().tokens;
}
