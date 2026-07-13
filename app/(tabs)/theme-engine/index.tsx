import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Dimensions,
} from "react-native";

// Native Dark Vector Icons
import { Palette, RefreshCw, Check } from "lucide-react-native";

// Core Shared APIs and Theme Engine Modules
import { apiFetch } from "@/lib/admin/apiClient";
import { applyFullTheme, themeDefaults } from "@/lib/theme";

// --- Premium Dark Theme System Colors ---
const THEME = {
  bgCanvas: "#0B0F19",
  bgSurface: "#161D30",
  bgCard: "#1F2A45",
  border: "#2A3958",
  textPrimary: "#F3F4F6",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
  primary: "#3B82F6",
  accent: "#10B981",
  danger: "#EF4444",
};

// --- Mobile Color Picker Fast Swatches ---
const COLOR_SWATCHES = [
  "#FFFFFF", // Crystal White
  "#3B82F6", // Electric Blue
  "#10B981", // Cyber Emerald
  "#F59E0B", // Neon Amber
  "#EF4444", // Crimson Red
  "#A855F7", // Tech Purple
];

export default function UICustomizationPanel() {
  const themes = [
    { id: "dark-minimal", name: "Dark Minimal" },
    { id: "neon-tech", name: "Neon Tech" },
    { id: "metallic-elite", name: "Metallic Elite" },
    { id: "executive-black", name: "Executive Black" },
    { id: "high-contrast", name: "High Contrast" },
    { id: "energy-mode", name: "Energy Mode" },
    { id: "crystal-white", name: "Crystal White" },
  ];

  const cardStyles = [
    { id: "glass", name: "Glassmorphism" },
    { id: "metallic", name: "Metallic" },
    { id: "neon", name: "Neon Glow" },
    { id: "flat", name: "Flat Default" },
  ];

  const [activeTheme, setActiveTheme] = useState("dark-minimal");
  const [activeCardStyle, setActiveCardStyle] = useState("glass");
  const [customTextColor, setCustomTextColor] = useState("#ffffff");
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // --- Initial Layout System Setup ---
  useEffect(() => {
    apiFetch<{
      item: { theme?: string; cardStyle?: string; customColors?: { textColor?: string } };
    }>("/api/ui-preferences")
      .then((res) => {
        const theme = res?.item?.theme || "dark-minimal";
        const cardStyle = res?.item?.cardStyle || "glass";
        const textColor = res?.item?.customColors?.textColor;

        setActiveTheme(theme);
        setActiveCardStyle(cardStyle);
        if (textColor) setCustomTextColor(textColor);

        applyFullTheme(theme, textColor || themeDefaults[theme], cardStyle);
      })
      .catch((err) => console.error("Failed to load initial UI configurations:", err));
  }, []);

  // --- Theme Preview Mutation Chains ---
  const handlePreviewTheme = (themeId: string) => {
    const defaultColor = themeDefaults[themeId] || "#ffffff";
    setActiveTheme(themeId);
    setCustomTextColor(defaultColor);
    applyFullTheme(themeId, defaultColor, activeCardStyle);
    setSaveSuccess(false);
  };

  const handlePreviewCardStyle = (styleId: string) => {
    setActiveCardStyle(styleId);
    applyFullTheme(activeTheme, customTextColor, styleId);
    setSaveSuccess(false);
  };

  const handleTextColorChange = (color: string) => {
    setCustomTextColor(color);
    applyFullTheme(activeTheme, color, activeCardStyle);
    setSaveSuccess(false);
  };

  // --- Async Context Persistence Pipelines ---
  const saveSettings = async () => {
    setLoading(true);
    setSaveSuccess(false);
    try {
      await apiFetch("/api/ui-preferences", {
        method: "PUT",
        body: JSON.stringify({
          theme: activeTheme,
          cardStyle: activeCardStyle,
          customColors: {
            textColor: customTextColor,
          },
        }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      Alert.alert("Execution Error", "Could not synchronize system preferences.");
    } finally {
      setLoading(false);
    }
  };

  const resetToDefault = async () => {
    setLoading(true);
    setSaveSuccess(false);
    try {
      const res = await apiFetch<{
        item: { theme?: string; cardStyle?: string; customColors?: { textColor?: string } };
      }>("/api/ui-preferences/reset", { method: "POST" });
      
      const theme = res.item.theme || "dark-minimal";
      const cardStyle = res.item.cardStyle || "glass";
      const textColor = res.item.customColors?.textColor || "#ffffff";

      setActiveTheme(theme);
      setActiveCardStyle(cardStyle);
      setCustomTextColor(textColor);
      applyFullTheme(theme, textColor, cardStyle);
      Alert.alert("System Restored", "Interface configs returned to baseline defaults.");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContentWrapper}>
        
        {/* --- Top Panel Identity Layout --- */}
        <View style={styles.headerBlockIdentity}>
          <View style={styles.paletteIconContainer}>
            <Palette size={26} color={THEME.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitleText}>Theme Engine</Text>
            <Text style={styles.headerSubtitleText}>
              Customize the interface exactly the way you want it.
            </Text>
          </View>
        </View>

        {/* --- Preset Theme Grid Selector Panel --- */}
        <View style={styles.uiConfigCardSection}>
          <Text style={styles.sectionHeaderLabelText}>Preset Themes</Text>
          <View style={styles.themesGridFlexContainer}>
            {themes.map((t) => {
              const isSelected = activeTheme === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  activeOpacity={0.8}
                  onClick={() => handlePreviewTheme(t.id)} // Desktop/Web mouse backward-compatibility wrapper
                  onPress={() => handlePreviewTheme(t.id)}
                  style={[styles.themeGridSelectorElement, isSelected && styles.themeElementActiveShadow]}
                >
                  <Text style={[styles.themeElementText, isSelected && styles.themeElementTextActive]}>
                    {t.name}
                  </Text>
                  {isSelected && <View style={styles.activeSelectionDotMarker} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* --- Card Style Selection Engine Layout --- */}
        <View style={styles.uiConfigCardSection}>
          <Text style={styles.sectionHeaderLabelText}>Card Style Engine</Text>
          <View style={styles.cardStylesVerticalStackLayout}>
            {cardStyles.map((s) => {
              const isSelected = activeCardStyle === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  activeOpacity={0.8}
                  onPress={() => handlePreviewCardStyle(s.id)}
                  style={[styles.cardStyleRowButtonElement, isSelected && styles.cardStyleElementActiveShadow]}
                >
                  <Text style={[styles.cardStyleText, isSelected && styles.cardStyleTextActive]}>
                    {s.name}
                  </Text>
                  {isSelected && <Check size={16} color={THEME.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* --- Dynamic Global Text Color Selector Engine --- */}
        <View style={styles.uiConfigCardSection}>
          <Text style={styles.sectionHeaderLabelText}>Global Text Color</Text>
          <Text style={styles.colorPickerInstructionsBodyText}>
            Select or enter a custom hex color code for your workspace font styles:
          </Text>
          
          <View style={styles.colorPickerInteractionLayoutRow}>
            {/* Native Swatch Circle Matrix Arrays */}
            <View style={styles.swatchCirclesGridBoxRow}>
              {COLOR_SWATCHES.map((hex) => (
                <TouchableOpacity
                  key={hex}
                  activeOpacity={0.7}
                  onPress={() => handleTextColorChange(hex)}
                  style={[
                    styles.swatchCircleElementButton, 
                    { backgroundColor: hex },
                    customTextColor.toLowerCase() === hex.toLowerCase() && styles.activeSwatchCircleOutline
                  ]}
                />
              ))}
            </View>

            {/* Direct Value Hex Text Field Input Entry */}
            <View style={styles.hexTextInputFieldWrapper}>
              <Text style={styles.hexPrefixLabelSymbol}>#</Text>
              <TextInput
                style={styles.hexNativeInputFieldElement}
                placeholder="FFFFFF"
                placeholderTextColor={THEME.textMuted}
                value={customTextColor.replace("#", "")}
                onChangeText={(text) => handleTextColorChange(`#${text}`)}
                maxLength={6}
                autoCapitalize="characters"
              />
            </View>
          </View>
        </View>

        {/* --- Action Persistence Control Footer Bar --- */}
        <View style={styles.actionPersistenceFooterCardContainer}>
          <TouchableOpacity 
            style={styles.restoreDefaultsNativeTouchBtn} 
            onPress={resetToDefault}
            disabled={loading}
          >
            <RefreshCw size={14} color={THEME.danger} />
            <Text style={styles.restoreDefaultsBtnText}>Restore Defaults</Text>
          </TouchableOpacity>

          <View style={styles.saveActionRightControlGroup}>
            {saveSuccess && (
              <Text style={styles.saveSuccessInlineIndicatorText}>Saved successfully!</Text>
            )}
            
            <TouchableOpacity 
              style={styles.savePreferencesPrimaryTouchBtn} 
              onPress={saveSettings}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.savePreferencesPrimaryBtnText}>Save Preferences</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: THEME.bgCanvas,
  },
  scrollContentWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
  },
  headerBlockIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
    marginTop: 8,
  },
  paletteIconContainer: {
    padding: 12,
    borderRadius: 50,
    backgroundColor: "rgba(59,130,246,0.1)",
  },
  headerTitleText: {
    fontSize: 24,
    fontWeight: "800",
    color: THEME.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitleText: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  uiConfigCardSection: {
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderLabelText: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    paddingBottom: 8,
    marginBottom: 12,
  },
  themesGridFlexContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  themeGridSelectorElement: {
    width: (Dimensions.get("window").width - 64) / 2,
    backgroundColor: THEME.bgCanvas,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  themeElementActiveShadow: {
    borderColor: THEME.primary,
    backgroundColor: THEME.bgCard,
    borderWidth: 1.5,
  },
  themeElementText: {
    fontSize: 13,
    fontWeight: "500",
    color: THEME.textSecondary,
  },
  themeElementTextActive: {
    color: THEME.textPrimary,
    fontWeight: "700",
  },
  activeSelectionDotMarker: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
  },
  cardStylesVerticalStackLayout: {
    gap: 8,
  },
  cardStyleRowButtonElement: {
    backgroundColor: THEME.bgCanvas,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardStyleElementActiveShadow: {
    borderColor: THEME.primary,
    backgroundColor: THEME.bgCard,
    borderWidth: 1.5,
  },
  cardStyleText: {
    fontSize: 13,
    fontWeight: "500",
    color: THEME.textSecondary,
  },
  cardStyleTextActive: {
    color: THEME.textPrimary,
    fontWeight: "700",
  },
  colorPickerInstructionsBodyText: {
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  colorPickerInteractionLayoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  swatchCirclesGridBoxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  swatchCircleElementButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  activeSwatchCircleOutline: {
    borderColor: THEME.primary,
    borderWidth: 2,
    transform: [{ scale: 1.15 }],
  },
  hexTextInputFieldWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.bgCanvas,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    width: 90,
    height: 36,
    paddingHorizontal: 8,
  },
  hexPrefixLabelSymbol: {
    color: THEME.textMuted,
    fontSize: 13,
    marginRight: 2,
    fontWeight: "600",
  },
  hexNativeInputFieldElement: {
    flex: 1,
    color: THEME.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    height: "100%",
    padding: 0,
  },
  actionPersistenceFooterCardContainer: {
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  restoreDefaultsNativeTouchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(239,68,68,0.06)",
  },
  restoreDefaultsBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.danger,
  },
  saveActionRightControlGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  saveSuccessInlineIndicatorText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.accent,
  },
  savePreferencesPrimaryTouchBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 130,
  },
  savePreferencesPrimaryBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
});