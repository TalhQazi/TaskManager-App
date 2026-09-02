import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  useWindowDimensions,
} from "react-native";
import { Palette, RefreshCw, Check, ChevronDown } from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { DEFAULT_PRESET_ID, resolvePreset } from "@/constants/design/presets";

export const THEME_DEFAULTS: Record<string, string> = {
  "professional-light": "#111827",
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
  // Default preset: blue on near-white, matching constants/design/presets.ts.
  "professional-light": {
    primary: "#2563eb", secondary: "#3b82f6", accent: "#7c3aed",
    headerBg: "#ffffff", sidebarBg: "#ffffff", dashboardBg: "#f6f8fa",
    cardBg: "#ffffff", sidebarIcon: "#2563eb", dashboardIcon: "#2563eb", sidebarText: "#111827",
    glowIntensity: 20,
  },
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

const THEMES = [
  { id: "professional-light", name: "Professional Light" },
  { id: "dark-minimal", name: "Dark Minimal" },
  { id: "neon-tech", name: "Neon Tech" },
  { id: "metallic-elite", name: "Metallic Elite" },
  { id: "executive-black", name: "Executive Black" },
  { id: "high-contrast", name: "High Contrast" },
  { id: "energy-mode", name: "Energy Mode" },
  { id: "crystal-white", name: "Crystal White" },
];

const CARD_STYLES = [
  { id: "glass", name: "Glassmorphism" },
  { id: "metallic", name: "Metallic" },
  { id: "neon", name: "Neon Glow" },
  { id: "flat", name: "Flat Default" },
];

const COLOR_PICKER_SPECTRUM = [
  "#ffffff", "#cbd5e1", "#64748b", "#334155", "#000000",
  "#fee2e2", "#f87171", "#ef4444", "#dc2626", "#991b1b",
  "#ffedd5", "#fb923c", "#f97316", "#ea580c", "#9a3412",
  "#fef9c3", "#fde047", "#eab308", "#ca8a04", "#854d0e",
  "#dcfce7", "#4ade80", "#22c55e", "#16a34a", "#166534",
  "#e0f2fe", "#38bdf8", "#0ea5e9", "#0284c7", "#075985",
  "#dbeafe", "#60a5fa", "#3b82f6", "#2563eb", "#1e40af",
  "#f3e8ff", "#c084fc", "#a855f7", "#9333ea", "#6b21a8",
  "#fae8ff", "#e879f9", "#d946ef", "#c026d3", "#86198f"
];

export default function ThemeEngine() {
  const { uiTheme, updateTheme } = useTheme();

  const { width, height } = useWindowDimensions();
  const wp = useCallback((percentage: number) => (width * percentage) / 100, [width]);
  const hp = useCallback((percentage: number) => (height * percentage) / 100, [height]);
  const isTablet = width >= 768;
  const isSmallScreen = width < 375;

  const [activeTheme, setActiveTheme] = useState(resolvePreset(uiTheme.theme).id);
  const [activeCardStyle, setActiveCardStyle] = useState(uiTheme.cardStyle || "flat");
  const [customTextColor, setCustomTextColor] = useState(
    uiTheme.customColors?.textColor || THEME_DEFAULTS[uiTheme.theme] || "#ffffff"
  );
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const styles = useMemo(
    () => getThemedStyles(uiTheme, wp, hp, isTablet, isSmallScreen),
    [uiTheme, wp, hp, isTablet, isSmallScreen]
  );
  
  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);

  const textColor = useMemo(() => {
    return uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#f4f4f5");
  }, [uiTheme, isLightTheme]);

  useEffect(() => {
    setActiveTheme(uiTheme.theme as any);
    setActiveCardStyle(uiTheme.cardStyle as any);
    setCustomTextColor(uiTheme.customColors?.textColor || THEME_DEFAULTS[uiTheme.theme] || "#ffffff");
  }, [uiTheme.theme, uiTheme.cardStyle, uiTheme.customColors?.textColor]);

  const handlePreviewTheme = (themeId: string) => {
    const preset = THEME_PRESETS[themeId] || THEME_PRESETS[DEFAULT_PRESET_ID];
    const defaultColor = THEME_DEFAULTS[themeId] || "#ffffff";
    
    setActiveTheme(themeId as any);
    setCustomTextColor(defaultColor);
    setSaveSuccess(false);

    updateTheme({
      theme: themeId,
      cardStyle: activeCardStyle,
      customColors: { 
        ...uiTheme.customColors, 
        primary: preset.primary,
        secondary: preset.secondary,
        accent: preset.accent,
        textColor: defaultColor 
      },
      panelColors: {
        ...uiTheme.panelColors,
        dashboardBackground: preset.dashboardBg,
        dashboardCardBackground: preset.cardBg,
        dashboardTextColor: defaultColor
      }
    } as any);
  };

  const handlePreviewCardStyle = (styleId: string) => {
    setActiveCardStyle(styleId as any);
    setSaveSuccess(false);
    updateTheme({ cardStyle: styleId } as any);
  };

  const handleTextColorChange = (color: string) => {
    const formattedColor = color.startsWith("#") ? color : `#${color}`;
    setCustomTextColor(formattedColor);
    setSaveSuccess(false);
    updateTheme({ 
      customColors: { ...uiTheme.customColors, textColor: formattedColor },
      panelColors: { ...uiTheme.panelColors, dashboardTextColor: formattedColor }
    } as any);
  };

  const saveSettings = async () => {
    setLoading(true);
    setSaveSuccess(false);
    try {
      const preset = THEME_PRESETS[activeTheme] || THEME_PRESETS[DEFAULT_PRESET_ID];
      await apiFetch("/api/ui-preferences", {
        method: "PUT",
        body: JSON.stringify({
          theme: activeTheme,
          cardStyle: activeCardStyle,
          customColors: {
            primary: preset.primary,
            secondary: preset.secondary,
            accent: preset.accent,
            textColor: customTextColor,
          },
          panelColors: {
            dashboardBackground: preset.dashboardBg,
            dashboardCardBackground: preset.cardBg,
            dashboardTextColor: customTextColor,
          }
        }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      Alert.alert("Execution Anomaly", "Could not synchronize theme configurations to core data architecture.");
    } finally {
      setLoading(false);
    }
  };

  const resetToDefault = async () => {
    setLoading(true);
    setSaveSuccess(false);
    try {
      const res = await apiFetch<{ item: any }>("/api/ui-preferences/reset", { method: "POST" });
      const theme = resolvePreset(res.item?.theme).id;
      const cardStyle = res.item?.cardStyle || "flat";
      const textColorVal = res.item?.customColors?.textColor || "#ffffff";
      const preset = THEME_PRESETS[theme] || THEME_PRESETS[DEFAULT_PRESET_ID];

      setActiveTheme(theme as any);
      setActiveCardStyle(cardStyle as any);
      setCustomTextColor(textColorVal);

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
      Alert.alert("System Restored", "Baseline interface configurations successfully established.");
    } catch (e) {
      console.error(e);
      Alert.alert("Reset Failure", "Failed to clear remote interface preferences.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle={isLightTheme ? "dark-content" : "light-content"} 
        backgroundColor={uiTheme.panelColors?.dashboardBackground || "#09090b"} 
      />
      
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Palette size={22} color={uiTheme.customColors?.primary || "#ffd27a"} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Theme Engine</Text>
          <Text style={styles.subtitle}>Customize the interface exactly the way you want it.</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>PRESET THEMES</Text>
          <View style={styles.themesGrid}>
            {THEMES.map((t) => {
              const isActive = activeTheme === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.themeBtn, isActive ? styles.themeBtnActive : styles.inactiveButton]}
                  onPress={() => handlePreviewTheme(t.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.themeBtnText, isActive ? styles.themeBtnTextActive : styles.inactiveButtonText]}>
                    {t.name}
                  </Text>
                  {isActive && <Check size={14} color={isLightTheme ? "#ffffff" : "#09090b"} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>CARD STYLE ENGINE</Text>
          <View style={styles.verticalListContainer}>
            {CARD_STYLES.map((sItem) => {
              const isActive = activeCardStyle === sItem.id;
              return (
                <TouchableOpacity
                  key={sItem.id}
                  style={[styles.styleListItem, isActive ? styles.styleListItemActive : styles.inactiveButton]}
                  onPress={() => handlePreviewCardStyle(sItem.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.styleListText, isActive ? styles.styleListTextActive : styles.inactiveButtonText]}>
                    {sItem.name}
                  </Text>
                  {isActive && <Check size={16} color={isLightTheme ? "#ffffff" : "#09090b"} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sectionHeading, { marginTop: hp(3) }]}>GLOBAL TEXT COLOR</Text>
          <View style={styles.colorPickerWrapper}>
            <TouchableOpacity 
              style={styles.colorConfigInputRow} 
              onPress={() => setShowColorPicker(!showColorPicker)}
              activeOpacity={0.8}
            >
              <View style={[styles.colorPreviewBlock, { backgroundColor: customTextColor || "#ffffff" }]} />
              <TextInput
                style={styles.textHexInput}
                value={customTextColor.replace("#", "")}
                onChangeText={handleTextColorChange}
                placeholder="FFFFFF"
                placeholderTextColor={isLightTheme ? "#94a3b8" : "#71717a"}
                autoCapitalize="characters"
                maxLength={6}
                editable={false}
                pointerEvents="none"
              />
              <ChevronDown size={16} color={textColor} style={{ opacity: 0.5 }} />
            </TouchableOpacity>
            
            {showColorPicker && (
              <View style={styles.spectrumPickerDropdownContainer}>
                {COLOR_PICKER_SPECTRUM.map((color) => {
                  const isSelected = customTextColor.toLowerCase() === color.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.spectrumSwatch, 
                        { backgroundColor: color }, 
                        isSelected && styles.activeSwatchBorder
                      ]}
                      onPress={() => {
                        handleTextColorChange(color);
                        setShowColorPicker(false);
                      }}
                      activeOpacity={0.7}
                    />
                  );
                })}
              </View>
            )}
            
            <View style={[styles.previewSimulationBlock, { backgroundColor: uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b") }]}>
              <Text style={[styles.previewSimulationText, { color: customTextColor }]}>
                Typography Realtime Contrast Text
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity 
          style={styles.restoreBtn} 
          onPress={resetToDefault} 
          disabled={loading}
          activeOpacity={0.7}
        >
          <RefreshCw size={14} color="#ef4444" style={loading ? { transform: [{ rotate: "45deg" }] } : {}} />
          <Text style={styles.restoreBtnText}>Restore Defaults</Text>
        </TouchableOpacity>

        <View style={styles.saveActionContainer}>
          {saveSuccess && (
            <Text style={styles.saveSuccessToast}>Saved!</Text>
          )}
          <TouchableOpacity 
            style={[styles.saveBtn, { backgroundColor: uiTheme.customColors?.primary || "#ffd27a" }]} 
            onPress={saveSettings} 
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color={isLightTheme ? "#ffffff" : "#09090b"} />
            ) : (
              <Text style={[styles.saveBtnText, { color: isLightTheme ? "#ffffff" : "#09090b" }]}>Save Preferences</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const getThemedStyles = (
  uiTheme: any,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number,
  isTablet: boolean,
  isSmallScreen: boolean
) => {
  const isLightTheme = uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  const structuralBorderColor = isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)";
  const surfaceAlphaColor = isLightTheme ? "rgba(0, 0, 0, 0.03)" : "rgba(255, 255, 255, 0.03)";
  
  const bg = uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b");
  const cardBg = uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#f8fafc" : "#141417");
  const textColor = uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#f4f4f5");

  const horizontalPadding = isSmallScreen ? wp(3) : isTablet ? wp(6) : wp(4.2);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(3),
      paddingHorizontal: horizontalPadding,
      paddingTop: hp(2),
      paddingBottom: hp(2),
      borderBottomWidth: 1,
      borderColor: structuralBorderColor,
    },
    iconContainer: {
      padding: wp(2.5),
      borderRadius: 99,
      backgroundColor: isLightTheme ? "rgba(0,0,0,0.04)" : "rgba(255, 255, 255, 0.06)",
    },
    title: {
      fontSize: isTablet ? 24 : 20,
      fontWeight: "800",
      color: textColor,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: isTablet ? 13 : 12,
      color: textColor,
      opacity: 0.6,
      marginTop: hp(0.3),
    },
    scrollContent: {
      paddingHorizontal: horizontalPadding,
      paddingTop: hp(2),
      paddingBottom: hp(15),
    },
    sectionCard: {
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: wp(4),
      padding: wp(4),
      marginBottom: hp(2),
      maxWidth: isTablet ? 720 : undefined,
      alignSelf: isTablet ? "center" : undefined,
      width: "100%",
    },
    sectionHeading: {
      fontSize: isTablet ? 12 : 11,
      fontWeight: "900",
      color: textColor,
      opacity: 0.5,
      letterSpacing: 1,
      borderBottomWidth: 1,
      borderColor: structuralBorderColor,
      paddingBottom: hp(0.8),
      marginBottom: hp(1.5),
    },
    themesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: wp(2.5),
    },
    themeBtn: {
      width: isTablet ? "31%" : "48%",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: wp(2.5),
      paddingVertical: hp(1.8),
      paddingHorizontal: wp(3),
    },
    inactiveButton: {
      backgroundColor: surfaceAlphaColor,
      borderColor: structuralBorderColor,
    },
    themeBtnActive: {
      backgroundColor: uiTheme.customColors?.primary || "#ffd27a",
      borderColor: uiTheme.customColors?.primary || "#ffd27a",
    },
    themeBtnText: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: "500",
    },
    inactiveButtonText: {
      color: textColor,
    },
    themeBtnTextActive: {
      color: isLightTheme ? "#ffffff" : "#09090b",
      fontWeight: "800",
    },
    verticalListContainer: {
      gap: hp(1),
    },
    styleListItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      padding: wp(3.5),
      borderRadius: wp(2.5),
    },
    styleListItemActive: {
      backgroundColor: uiTheme.customColors?.primary || "#ffd27a",
      borderColor: uiTheme.customColors?.primary || "#ffd27a",
    },
    styleListText: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: "500",
    },
    styleListTextActive: {
      color: isLightTheme ? "#ffffff" : "#09090b",
      fontWeight: "800",
    },
    colorPickerWrapper: {
      gap: hp(1.5),
    },
    colorConfigInputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(3),
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      padding: wp(2.5),
      borderRadius: wp(2.5),
    },
    colorPreviewBlock: {
      width: isTablet ? 36 : 32,
      height: isTablet ? 36 : 32,
      borderRadius: wp(1.5),
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    textHexInput: {
      flex: 1,
      color: textColor,
      fontSize: isTablet ? 15 : 14,
      fontWeight: "700",
      paddingVertical: hp(0.5),
    },
    spectrumPickerDropdownContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: wp(2),
      padding: wp(3),
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: wp(2.5),
      justifyContent: "flex-start",
      marginTop: hp(0.3),
    },
    spectrumSwatch: {
      width: isTablet ? 38 : isSmallScreen ? 28 : 33,
      height: isTablet ? 38 : isSmallScreen ? 28 : 33,
      borderRadius: wp(1.5),
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    activeSwatchBorder: {
      borderColor: uiTheme.customColors?.primary || "#ffd27a",
      borderWidth: 2,
      transform: [{ scale: 1.1 }],
    },
    previewSimulationBlock: {
      width: "100%",
      padding: wp(3.5),
      borderRadius: wp(2.5),
      borderWidth: 1,
      borderColor: structuralBorderColor,
      alignItems: "center",
      justifyContent: "center",
      marginTop: hp(0.5),
    },
    previewSimulationText: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: "700",
    },
    actionBar: {
      position: "absolute", 
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: cardBg,
      borderTopWidth: 1,
      borderColor: structuralBorderColor,
      paddingHorizontal: horizontalPadding,
      paddingVertical: hp(1.8),
      maxWidth: isTablet ? 720 : undefined,
      alignSelf: isTablet ? "center" : undefined,
      width: "100%",
    },
    restoreBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
      paddingVertical: hp(1.2),
    },
    restoreBtnText: {
      color: "#ef4444",
      fontSize: isTablet ? 14 : 13,
      fontWeight: "600",
    },
    saveActionContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(3),
    },
    saveSuccessToast: {
      color: "#10b981",
      fontSize: isTablet ? 13 : 12,
      fontWeight: "700",
    },
    saveBtn: {
      paddingHorizontal: wp(5),
      paddingVertical: hp(1.5),
      borderRadius: wp(2.5),
      minWidth: isTablet ? 150 : 130,
      alignItems: "center",
      justifyContent: "center",
    },
    saveBtnText: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: "800",
    },
  });
};