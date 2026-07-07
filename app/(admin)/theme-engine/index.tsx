import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Dimensions,
  TextInput,
  Alert
} from "react-native";
import { Palette, RefreshCw, ChevronRight, X } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";

const { height } = Dimensions.get("window");

interface ConfigurationOption {
  id: string;
  name: string;
}

export default function ThemeEngine() {
  const { uiTheme, updateTheme, resetTheme, saveToBackend } = useTheme();

  const themes: ConfigurationOption[] = [
    { id: "dark-minimal", name: "Dark Minimal" },
    { id: "neon-tech", name: "Neon Tech" },
    { id: "metallic-elite", name: "Metallic Elite" },
    { id: "executive-black", name: "Executive Black" },
    { id: "high-contrast", name: "High Contrast" },
    { id: "energy-mode", name: "Energy Mode" },
    { id: "crystal-white", name: "Crystal White" },
  ];

  const themeDefaults: Record<string, string> = {
    "dark-minimal": "#f8fafc",
    "neon-tech": "#e0f7fa",
    "metallic-elite": "#ffd27a",
    "executive-black": "#f3f4f6",
    "high-contrast": "#ffffff",
    "energy-mode": "#ffedd5",
    "crystal-white": "#000000",
  };

  const cardStyles: ConfigurationOption[] = [
    { id: "glass", name: "Glassmorphism" },
    { id: "metallic", name: "Metallic" },
    { id: "neon", name: "Neon Glow" },
    { id: "flat", name: "Flat Default" },
  ];

  const discreteSpectrumGrid: string[][] = [
    ["#ffffff", "#f8fafc", "#f1f5f9", "#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b", "#475569", "#334155", "#0f172a"],
    ["#fef2f2", "#fee2e2", "#fecaca", "#fca5a5", "#f87171", "#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d"],
    ["#fff7ed", "#ffedd5", "#fed7aa", "#fdbb2d", "#fb923c", "#f97316", "#ea580c", "#c2410c", "#9a3412", "#7c2d12"],
    ["#fef3c7", "#fde68a", "#fcd34d", "#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f", "#451a03", "#3c1502"],
    ["#ecfdf5", "#d1fae5", "#a7f3d0", "#6ee7b7", "#34d399", "#10b981", "#059669", "#047857", "#065f46", "#064e3b"],
    ["#e0f7fa", "#e0f2fe", "#bae6fd", "#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7", "#0369a1", "#075985", "#0c4a6e"],
    ["#f5f3ff", "#e0e7ff", "#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1", "#4f46e5", "#4338ca", "#3730a3", "#1e1b4b"],
    ["#faf5ff", "#f3e8ff", "#e9d5ff", "#d8b4fe", "#c084fc", "#a855f7", "#9333ea", "#7e22ce", "#6b21a8", "#581c87"]
  ];

  const [activeTheme, setActiveTheme] = useState<string>(uiTheme.theme);
  const [activeCardStyle, setActiveCardStyle] = useState<string>(uiTheme.cardStyle);
  const [customTextColor, setCustomTextColor] = useState<string>(
    uiTheme.customColors?.textColor || themeDefaults[uiTheme.theme] || "#ffffff"
  );
  
  const [loading, setLoading] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isPickerVisible, setIsPickerVisible] = useState<boolean>(false);
  const [modalHexInput, setModalHexInput] = useState<string>(customTextColor);

  const styles = useMemo(() => getThemedStyles(uiTheme), [uiTheme]);
  const isLightTheme = useMemo(() => uiTheme.theme.includes("crystal") || uiTheme.panelColors.dashboardTextColor === "#000000", [uiTheme]);

  useEffect(() => {
    setActiveTheme(uiTheme.theme);
    setActiveCardStyle(uiTheme.cardStyle);
    setCustomTextColor(uiTheme.customColors?.textColor || themeDefaults[uiTheme.theme] || "#ffffff");
  }, [uiTheme.theme, uiTheme.cardStyle, uiTheme.customColors?.textColor]);

  const handlePreviewTheme = (themeId: string) => {
    const defaultColor = themeDefaults[themeId] || "#ffffff";
    setActiveTheme(themeId);
    setCustomTextColor(defaultColor);
    setSaveSuccess(false);
    updateTheme({
      theme: themeId as any,
      customColors: { textColor: defaultColor },
    });
  };

  const handlePreviewCardStyle = (styleId: string) => {
    setActiveCardStyle(styleId);
    setSaveSuccess(false);
    updateTheme({ cardStyle: styleId as any });
  };

  const handleTextColorChange = (color: string) => {
    setCustomTextColor(color);
    setSaveSuccess(false);
    updateTheme({ customColors: { textColor: color } });
  };

  const openColorPickerDialog = () => {
    setModalHexInput(customTextColor);
    setIsPickerVisible(true);
  };

  const applySelectedPickerColor = () => {
    let sanitizedHex = modalHexInput.trim();
    if (!sanitizedHex.startsWith("#")) {
      sanitizedHex = "#" + sanitizedHex;
    }
    
    const validHexRule = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!validHexRule.test(sanitizedHex)) {
      Alert.alert("Invalid Color", "Please specify a format matching standard hex criteria.");
      return;
    }

    handleTextColorChange(sanitizedHex);
    setIsPickerVisible(false);
  };

  const saveSettings = async () => {
    setLoading(true);
    setSaveSuccess(false);
    try {
      const consolidatedState = {
        ...uiTheme,
        theme: activeTheme as any,
        cardStyle: activeCardStyle as any,
        customColors: {
          ...uiTheme.customColors,
          textColor: customTextColor,
        },
      };
      await saveToBackend(consolidatedState);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not sync UI preference parameters to cloud service storage infrastructure.");
    } finally {
      setLoading(false);
    }
  };

  const resetToDefault = async () => {
    setLoading(true);
    setSaveSuccess(false);
    try {
      await resetTheme();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error(e);
      Alert.alert("Reset Error", "Could not restore core interface system configuration properties.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollCanvas} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerBlock}>
          <View style={styles.titleRow}>
            <View style={styles.iconBox}>
              <Palette size={24} color={uiTheme.customColors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Theme Engine</Text>
              <Text style={styles.headerSubtitle}>Customize the interface exactly the way you want it.</Text>
            </View>
          </View>
        </View>

        <View style={styles.gridColumnsContainer}>
          
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Preset Themes</Text>
            <View style={styles.gridContainer}>
              {themes.map((t) => {
                const isActive = activeTheme === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.themeButton, isActive ? styles.activeButton : styles.inactiveButton]}
                    onPress={() => handlePreviewTheme(t.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.buttonText, isActive ? styles.activeButtonText : styles.inactiveButtonText]}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Card Style Engine</Text>
            <View style={styles.listContainer}>
              {cardStyles.map((sItem) => {
                const isActive = activeCardStyle === sItem.id;
                return (
                  <TouchableOpacity
                    key={sItem.id}
                    style={[styles.cardStyleButton, isActive ? styles.activeButton : styles.inactiveButton]}
                    onPress={() => handlePreviewCardStyle(sItem.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.buttonText, isActive ? styles.activeButtonText : styles.inactiveButtonText]}>
                      {sItem.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionHeading, styles.spacingTop]}>Global Text Color</Text>
            <View style={styles.pickerAnchorRow}>
              <TouchableOpacity 
                style={styles.colorPickerTriggerButton} 
                activeOpacity={0.8}
                onPress={openColorPickerDialog}
              >
                <View style={[styles.colorPreviewWellBlock, { backgroundColor: customTextColor }]} />
                <View style={styles.colorPreviewLabelBlock}>
                  <Text style={styles.activeColorTextDisplay}>{customTextColor.toUpperCase()}</Text>
                  <Text style={styles.activeColorLabelHint}>Select the default text color for the admin panel</Text>
                </View>
                <ChevronRight size={16} color={uiTheme.panelColors.dashboardTextColor} style={{ opacity: 0.4 }} />
              </TouchableOpacity>
            </View>
          </View>

        </View>

        <View style={styles.actionBarRow}>
          <TouchableOpacity 
            style={styles.restoreButton} 
            onPress={resetToDefault}
            disabled={loading}
          >
            <RefreshCw size={14} color="#ef4444" style={styles.restoreIconMargin} />
            <Text style={styles.restoreButtonText}>Restore Defaults</Text>
          </TouchableOpacity>
          
          <View style={styles.actionRightFlexBox}>
            
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: uiTheme.customColors.primary }]} 
              onPress={saveSettings}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={isLightTheme ? "#ffffff" : "#09090b"} />
              ) : (
                <Text style={styles.saveButtonText}>Save Preferences</Text>
              )}
            </TouchableOpacity>
            {saveSuccess && (
              <Text style={styles.successNotificationMessage}>Settings saved!</Text>
            )}
          </View>
        </View>

      </ScrollView>

      <Modal animationType="fade" transparent={true} visible={isPickerVisible} onRequestClose={() => setIsPickerVisible(false)}>
        <TouchableOpacity style={styles.modalBlurOverlay} activeOpacity={1} onPress={() => setIsPickerVisible(false)}>
          <View style={styles.modalContentCard}>
            
            <View style={styles.modalCardHeaderTopRow}>
              <Text style={styles.modalCardTitleHeading}>Select Text Color</Text>
              <TouchableOpacity onPress={() => setIsPickerVisible(false)} style={styles.closeModalCrossButton}>
                <X size={18} color={uiTheme.panelColors.dashboardTextColor} style={{ opacity: 0.5 }} />
              </TouchableOpacity>
            </View>

            <View style={[styles.pickerActiveDisplayBanner, { backgroundColor: modalHexInput }]}>
              <Text style={[styles.pickerActiveDisplayTextContrast, {
                color: modalHexInput.toLowerCase() === "#ffffff" || modalHexInput.toLowerCase() === "#f8fafc" ? "#000000" : "#ffffff"
              }]}>
                Typography Preview Text
              </Text>
            </View>

            <View style={styles.spectrumGridCanvasBox}>
              {discreteSpectrumGrid.map((row, rIndex) => (
                <View key={rIndex} style={styles.spectrumFlexGridRow}>
                  {row.map((colorCell) => {
                    const isCellTargeted = modalHexInput.toLowerCase() === colorCell.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={colorCell}
                        style={[
                          styles.spectrumColorNodeTile, 
                          { backgroundColor: colorCell }, 
                          isCellTargeted && { borderColor: uiTheme.customColors.primary, borderWidth: 2 }
                        ]}
                        onPress={() => setModalHexInput(colorCell)}
                        activeOpacity={0.7}
                      />
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.manualHexInputFieldWrapperBlock}>
              <Text style={styles.manualInputFieldNameLabel}>Custom HEX Code</Text>
              <TextInput
                style={styles.manualInputHexText}
                value={modalHexInput}
                onChangeText={setModalHexInput}
                placeholder="#FFFFFF"
                placeholderTextColor="rgba(148,163,184,0.4)"
                autoCapitalize="characters"
                maxLength={7}
              />
            </View>

            <View style={styles.modalCardActionsFooterRow}>
              <TouchableOpacity style={styles.modalCancelButtonAction} onPress={() => setIsPickerVisible(false)}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmitButtonAction, { backgroundColor: uiTheme.customColors.primary }]} onPress={applySelectedPickerColor}>
                <Text style={styles.modalSubmitButtonText}>Apply Color</Text>
              </TouchableOpacity>
            </View>

          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const getThemedStyles = (uiTheme: any) => {
  const isLightTheme = uiTheme.theme.includes("crystal") || uiTheme.panelColors.dashboardTextColor === "#000000";
  const structuralBorderColor = isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)";
  const surfaceAlphaColor = isLightTheme ? "rgba(0, 0, 0, 0.03)" : "rgba(255, 255, 255, 0.03)";

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: uiTheme.panelColors.dashboardBackground,
    },
    scrollCanvas: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },
    headerBlock: {
      paddingVertical: 24,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    iconBox: {
      backgroundColor: isLightTheme ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)",
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "800",
      letterSpacing: -0.5,
      color: uiTheme.panelColors.dashboardTextColor,
    },
    headerSubtitle: {
      fontSize: 13,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.6,
      marginTop: 2,
    },
    gridColumnsContainer: {
      gap: 16,
    },
    sectionContainer: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      padding: 16,
      backgroundColor: uiTheme.panelColors.dashboardCardBackground,
    },
    sectionHeading: {
      fontSize: 11,
      fontWeight: "700",
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.5,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      borderBottomWidth: 1,
      borderBottomColor: structuralBorderColor,
      paddingBottom: 8,
      marginBottom: 14,
    },
    spacingTop: {
      marginTop: 24,
    },
    gridContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    listContainer: {
      gap: 10,
    },
    themeButton: {
      width: "48%",
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
    },
    cardStyleButton: {
      width: "100%",
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
    },
    inactiveButton: {
      backgroundColor: surfaceAlphaColor,
      borderColor: structuralBorderColor,
    },
    activeButton: {
      backgroundColor: uiTheme.customColors.primary,
      borderColor: uiTheme.customColors.primary,
    },
    buttonText: {
      fontSize: 13,
      fontWeight: "600",
    },
    inactiveButtonText: {
      color: uiTheme.panelColors.dashboardTextColor,
    },
    activeButtonText: {
      color: isLightTheme ? "#ffffff" : "#09090b",
      fontWeight: "700",
    },
    pickerAnchorRow: {
      width: "100%",
    },
    colorPickerTriggerButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 10,
      padding: 10,
    },
    colorPreviewWellBlock: {
      width: 40,
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      marginRight: 12,
    },
    colorPreviewLabelBlock: {
      flex: 1,
    },
    activeColorTextDisplay: {
      fontSize: 14,
      fontWeight: "800",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    activeColorLabelHint: {
      fontSize: 11,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.5,
      marginTop: 2,
    },
    actionBarRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      padding: 12,
      marginTop: 24,
      backgroundColor: uiTheme.panelColors.dashboardCardBackground,
    },
    restoreButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: "rgba(239, 68, 68, 0.08)",
    },
    restoreIconMargin: {
      marginRight: 6,
    },
    restoreButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#ef4444",
    },
    actionRightFlexBox: {
    //  flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    successNotificationMessage: {
      fontSize: 12,
      color: "#22c55e",
      fontWeight: "600",
    },
    saveButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
      minWidth: 130,
    },
    saveButtonText: {
      color: isLightTheme ? "#ffffff" : "#09090b",
      fontSize: 12,
      fontWeight: "700",
    },
    modalBlurOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "flex-end",
    },
    modalContentCard: {
      backgroundColor: uiTheme.panelColors.dashboardCardBackground,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      width: "100%",
      maxHeight: height * 0.85,
      padding: 20,
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    modalCardHeaderTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: structuralBorderColor,
      paddingBottom: 12,
    },
    modalCardTitleHeading: {
      fontSize: 16,
      fontWeight: "800",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    closeModalCrossButton: {
      padding: 4,
    },
    pickerActiveDisplayBanner: {
      width: "100%",
      height: 48,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    pickerActiveDisplayTextContrast: {
      fontSize: 13,
      fontWeight: "700",
    },
    spectrumGridCanvasBox: {
      width: "100%",
      gap: 6,
      marginBottom: 18,
    },
    spectrumFlexGridRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
    },
    spectrumColorNodeTile: {
      width: "8.5%",
      aspectRatio: 1,
      borderRadius: 4,
      borderWidth: 0.5,
      borderColor: structuralBorderColor,
    },
    manualHexInputFieldWrapperBlock: {
      marginBottom: 14,
    },
    manualInputFieldNameLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.7,
      marginBottom: 6,
    },
    manualInputHexText: {
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: 8,
      height: 40,
      paddingHorizontal: 12,
      fontSize: 13,
      color: uiTheme.panelColors.dashboardTextColor,
      backgroundColor: surfaceAlphaColor,
      fontWeight: "700",
    },
    modalCardActionsFooterRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: structuralBorderColor,
      paddingTop: 14,
    },
    modalCancelButtonAction: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      backgroundColor: surfaceAlphaColor,
    },
    modalCancelButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.8,
    },
    modalSubmitButtonAction: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 6,
    },
    modalSubmitButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: isLightTheme ? "#ffffff" : "#09090b",
    },
  });
};