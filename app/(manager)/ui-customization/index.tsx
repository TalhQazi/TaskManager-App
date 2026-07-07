import React, { useState, useEffect, useMemo } from "react";
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
} from "react-native";
import { Palette, RefreshCw, Check } from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";



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

const THEMES = [
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

const PRESET_PICKER_COLORS = ["#f8fafc", "#e0f7fa", "#d4af37", "#ffffff", "#ffedd5", "#ef4444", "#10b981"];


export default function ThemeEngine() {
  const { uiTheme, updateTheme } = useTheme();

  const [activeTheme, setActiveTheme] = useState(uiTheme.theme);
  const [activeCardStyle, setActiveCardStyle] = useState(uiTheme.cardStyle);
  const [customTextColor, setCustomTextColor] = useState(
    uiTheme.customColors?.textColor || THEME_DEFAULTS[uiTheme.theme] || "#ffffff"
  );
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

 
  const styles = useMemo(() => getThemedStyles(uiTheme), [uiTheme]);
  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);


  useEffect(() => {
    setActiveTheme(uiTheme.theme);
    setActiveCardStyle(uiTheme.cardStyle);
    setCustomTextColor(uiTheme.customColors?.textColor || THEME_DEFAULTS[uiTheme.theme] || "#ffffff");
  }, [uiTheme.theme, uiTheme.cardStyle, uiTheme.customColors?.textColor]);

  const handlePreviewTheme = (themeId: string) => {
    const preset = THEME_PRESETS[themeId] || THEME_PRESETS["dark-minimal"];
    const defaultColor = THEME_DEFAULTS[themeId] || "#ffffff";
    
    setActiveTheme(themeId);
    setCustomTextColor(defaultColor);
    setSaveSuccess(false);
    

    updateTheme({
      theme: themeId,
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
    });
  };

  const handlePreviewCardStyle = (styleId: string) => {
    setActiveCardStyle(styleId);
    setSaveSuccess(false);
    updateTheme({ cardStyle: styleId });
  };

  const handleTextColorChange = (color: string) => {
    setCustomTextColor(color);
    setSaveSuccess(false);
    updateTheme({ 
      customColors: { ...uiTheme.customColors, textColor: color },
      panelColors: { ...uiTheme.panelColors, dashboardTextColor: color }
    });
  };

  const saveSettings = async () => {
    setLoading(true);
    setSaveSuccess(false);
    try {
      const preset = THEME_PRESETS[activeTheme] || THEME_PRESETS["dark-minimal"];
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
      Alert.alert("Configuration Anomaly", "Could not synchronize theme preferences to core server architecture.");
    } finally {
      setLoading(false);
    }
  };

  const resetToDefault = async () => {
    setLoading(true);
    setSaveSuccess(false);
    try {
      const res = await apiFetch<{ item: any }>("/api/ui-preferences/reset", { method: "POST" });
      const theme = res.item?.theme || "dark-minimal";
      const cardStyle = res.item?.cardStyle || "glass";
      const textColor = res.item?.customColors?.textColor || "#ffffff";
      const preset = THEME_PRESETS[theme] || THEME_PRESETS["dark-minimal"];

      setActiveTheme(theme);
      setActiveCardStyle(cardStyle);
      setCustomTextColor(textColor);

      updateTheme({
        theme,
        cardStyle,
        customColors: { 
          primary: preset.primary, 
          secondary: preset.secondary, 
          accent: preset.accent, 
          textColor 
        },
        panelColors: {
          dashboardBackground: preset.dashboardBg,
          dashboardCardBackground: preset.cardBg,
          dashboardTextColor: textColor
        }
      });
    } catch (e) {
      console.error(e);
      Alert.alert("Reset Error", "Failed to clear remote preferences.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} key={uiTheme?.theme || 'default'}>
      <StatusBar 
        barStyle={isLightTheme ? "dark-content" : "light-content"} 
        backgroundColor={uiTheme.panelColors?.dashboardBackground || "#09090b"} 
      />
      
      {/* Title Header Block */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Palette size={22} color={uiTheme.customColors?.primary || "#ffd27a"} />
        </View>
        <View>
          <Text style={styles.title}>Theme Engine</Text>
          <Text style={styles.subtitle}>Customize the interface exactly the way you want it.</Text>
        </View>
      </View>

      {/* Main Configurations Body */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Preset Themes Container */}
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

        {/* Card Style Configuration Section */}
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

          {/* Global Text Color Setup */}
          <Text style={[styles.sectionHeading, { marginTop: 24 }]}>GLOBAL TEXT COLOR</Text>
          <View style={styles.colorPickerWrapper}>
            <View style={styles.colorConfigInputRow}>
              <View style={[styles.colorPreviewBlock, { backgroundColor: customTextColor || "#ffffff" }]} />
              <TextInput
                style={styles.textHexInput}
                value={customTextColor}
                onChangeText={handleTextColorChange}
                placeholder="#FFFFFF"
                placeholderTextColor={isLightTheme ? "#94a3b8" : "#71717a"}
                autoCapitalize="characters"
                maxLength={7}
              />
            </View>
            
            {/* Quick-tap Swatch Palette */}
            <View style={styles.presetPaletteRow}>
              {PRESET_PICKER_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.presetSwatch, { backgroundColor: color }, customTextColor === color && styles.activeSwatchBorder]}
                  onPress={() => handleTextColorChange(color)}
                />
              ))}
            </View>
            
            {/* Typography Preview Panel Simulation */}
            <View style={[styles.previewSimulationBlock, { backgroundColor: uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b") }]}>
              <Text style={[styles.previewSimulationText, { color: customTextColor }]}>
                Typography Realtime Contrast Text
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Persistent Dynamic Action Control Bar Footer */}
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


const getThemedStyles = (uiTheme: any) => {
  const isLightTheme = uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  const structuralBorderColor = isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)";
  const surfaceAlphaColor = isLightTheme ? "rgba(0, 0, 0, 0.03)" : "rgba(255, 255, 255, 0.03)";
  
  const bg = uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b");
  const cardBg = uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#f8fafc" : "#141417");
  const textColor = uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#f4f4f5");

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderColor: structuralBorderColor,
    },
    iconContainer: {
      padding: 10,
      borderRadius: 99,
      backgroundColor: isLightTheme ? "rgba(0,0,0,0.04)" : "rgba(255, 255, 255, 0.06)",
    },
    title: {
      fontSize: 20,
      fontWeight: "800",
      color: textColor,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 12,
      color: textColor,
      opacity: 0.6,
      marginTop: 2,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 120,
    },
    sectionCard: {
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    sectionHeading: {
      fontSize: 11,
      fontWeight: "900",
      color: textColor,
      opacity: 0.5,
      letterSpacing: 1,
      borderBottomWidth: 1,
      borderColor: structuralBorderColor,
      paddingBottom: 6,
      marginBottom: 12,
    },
    themesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    themeBtn: {
      width: "48%",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 14,
      paddingHorizontal: 12,
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
      fontSize: 13,
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
      gap: 8,
    },
    styleListItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      padding: 14,
      borderRadius: 10,
    },
    styleListItemActive: {
      backgroundColor: uiTheme.customColors?.primary || "#ffd27a",
      borderColor: uiTheme.customColors?.primary || "#ffd27a",
    },
    styleListText: {
      fontSize: 13,
      fontWeight: "500",
    },
    styleListTextActive: {
      color: isLightTheme ? "#ffffff" : "#09090b",
      fontWeight: "800",
    },
    colorPickerWrapper: {
      gap: 12,
    },
    colorConfigInputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      padding: 10,
      borderRadius: 10,
    },
    colorPreviewBlock: {
      width: 32,
      height: 32,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    textHexInput: {
      flex: 1,
      color: textColor,
      fontSize: 14,
      fontWeight: "700",
      paddingVertical: 4,
    },
    presetPaletteRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 4,
    },
    presetSwatch: {
      width: 28,
      height: 28,
      borderRadius: 99,
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
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    previewSimulationText: {
      fontSize: 13,
      fontWeight: "700",
      
    },
    actionBar: {
      position: "absolute",
      bottom: 30,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: cardBg,
      borderTopWidth: 1,
      borderColor: structuralBorderColor,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    restoreBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 10,
    },
    restoreBtnText: {
      color: "#ef4444",
      fontSize: 13,
      fontWeight: "600",
    },
    saveActionContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    saveSuccessToast: {
      color: "#10b981",
      fontSize: 12,
      fontWeight: "700",
    },
    saveBtn: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
      minWidth: 130,
      alignItems: "center",
      justifyContent: "center",
    },
    saveBtnText: {
      fontSize: 13,
      fontWeight: "800",
    },
  });
};