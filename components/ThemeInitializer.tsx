import React, { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { apiFetch } from '@/lib/admin/apiClient';
import { THEME_DEFAULTS, THEME_PRESETS } from '@/constants/theme';

export function ThemeInitializer({ children }: { children: React.ReactNode }) {
  const { updateTheme, uiTheme } = useTheme();
  const [isThemeReady, setIsThemeReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await apiFetch<{ item: any }>("/api/ui-preferences");
        if (res?.item) {
          const theme = res.item.theme || "dark-minimal";
          const cardStyle = res.item.cardStyle || "glass";
          const textColorVal = res.item.customColors?.textColor || THEME_DEFAULTS[theme] || "#ffffff";
          const preset = THEME_PRESETS[theme] || THEME_PRESETS["dark-minimal"];

          updateTheme({
            theme,
            cardStyle,
            customColors: { 
              primary: preset.primary, 
              secondary: preset.secondary,
              accent: preset.accent, 
              textColor: textColorVal 
            },
            panelColors: {
              dashboardBackground: preset.dashboardBg,
              dashboardCardBackground: preset.cardBg,
              dashboardTextColor: textColorVal
            }
          } as any);
        }
      } catch (e) {
        console.error("Theme init error:", e);
      } finally {
        setIsThemeReady(true);
      }
    };
    init();
  }, []);

  if (!isThemeReady) return null;
  return <>{children}</>;
}