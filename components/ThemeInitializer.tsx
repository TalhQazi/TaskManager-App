import React, { useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { apiFetch } from '@/lib/admin/apiClient';
import { THEME_DEFAULTS, THEME_PRESETS } from '@/constants/theme';
import { DEFAULT_PRESET_ID, resolvePreset } from '@/constants/design/presets';

export function ThemeInitializer({ children }: { children: React.ReactNode }) {
  const { updateTheme } = useTheme();

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const res = await apiFetch<{ item: any }>("/api/ui-preferences");
        if (res?.item && isMounted) {
          // Fall back to the app's configured default rather than a hardcoded preset id:
          // a stored record with no `theme` field used to force dark-minimal, which
          // silently overrode the default for anyone whose preferences predate it.
          const theme = resolvePreset(res.item.theme).id;
          const cardStyle = res.item.cardStyle || "flat";
          const textColorVal = res.item.customColors?.textColor || THEME_DEFAULTS[theme] || "#ffffff";
          const preset = THEME_PRESETS[theme] || THEME_PRESETS[DEFAULT_PRESET_ID];

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
      }
    };
    init();
    return () => { isMounted = false; };
  }, [updateTheme]);

  return <>{children}</>;
}