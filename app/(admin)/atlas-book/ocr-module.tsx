import React, { useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Alert,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ScanLine,
  Upload,
  FileText,
  CheckCircle2,
  X,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

interface ExtractedItem {
  desc: string;
  price: number;
}

interface OcrExtractedResults {
  vendor: string;
  date: string;
  total: number;
  currency: string;
  items: ExtractedItem[];
}

interface ActiveFileObject {
  name: string;
  size: string;
  uri: string;
}

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:       uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#F8FAFC"),
    cardBg:           uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#18181b" : "#FFFFFF"),
    text:             uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F4F4F5" : "#0F172A"),
    textSecondary:    isDark ? "#A1A1AA" : "#475569",
    textMuted:        isDark ? "#71717A" : "#64748B",
    border:           isDark ? "#27272A" : "#E2E8F0",
    borderLight:      isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    primary:          uiTheme.customColors?.primary || "#B45309",
    primaryText:      "#FFFFFF",
    primaryTranslucent: isDark ? "rgba(180, 83, 9, 0.2)" : "rgba(180, 83, 9, 0.04)",
    successText:      isDark ? "#34D399" : "#10b981",
    specialCardBg:    isDark ? "#27272A" : "#0F172A",
    specialCardText:  "#FFFFFF",
    specialCardMuted: isDark ? "#A1A1AA" : "#94A3B8",
    uploadCircleBg:   isDark ? "#27272A" : "#F1F5F9",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    headerBlock: {
      paddingVertical: 20,
      width: "100%",
    },
    titleInlineFlexRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 6,
    },
    headerIconMargin: {
      marginRight: 8,
    },
    moduleTitleHeading: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    moduleSubtitleText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    workspaceLayoutSplitMatrixColumn: {
      width: "100%",
      gap: 16,
    },
    cardSurfaceContainer: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    dashedBordersLayoutFrame: {
      borderStyle: "dashed",
      borderWidth: 2,
      borderColor: colors.border,
      paddingVertical: 36,
    },
    dropzonePassiveLayoutContent: {
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    uploadIconBackgroundCircleFrame: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.uploadCircleBg,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    dropzoneTitleLabelText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    dropzoneInstructionsParagraphText: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 16,
      textAlign: "center",
    },
    browseButtonActionAnchor: {
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
      backgroundColor: colors.cardBg,
    },
    browseButtonLabelText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    attachedFileInteractiveWorkspace: {
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    documentIconIsolatedWrapper: {
      position: "relative",
      padding: 12,
      backgroundColor: colors.primaryTranslucent,
      borderRadius: 16,
      marginBottom: 12,
    },
    clearAttachmentBadgeAbsoluteButton: {
      position: "absolute",
      top: -4,
      right: -4,
      backgroundColor: "#ef4444",
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: colors.cardBg,
    },
    attachedFileNameLabelText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      maxWidth: width * 0.7,
    },
    attachedFileSizeSubtext: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
      marginBottom: 16,
    },
    actionProcessingButtonAnchor: {
      flexDirection: "row",
      backgroundColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      maxWidth: 240,
    },
    disabledActionOpacity: {
      opacity: 0.65,
    },
    inlineProcessingIndicatorMargin: {
      marginRight: 6,
    },
    actionProcessingButtonLabelText: {
      color: colors.primaryText,
      fontSize: 13,
      fontWeight: "600",
    },
    resultsCardHeaderMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      paddingBottom: 10,
      marginBottom: 14,
    },
    inlineIconMarginRight: {
      marginRight: 6,
    },
    resultsCardTitleLabelHeading: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    emptyStateFallbackContainerCentered: {
      paddingVertical: 54,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyStateParagraphLabelText: {
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: "italic",
      textAlign: "center",
    },
    processingActivityIndicatorContainer: {
      paddingVertical: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    processingActivityIndicatorSpacer: {
      marginBottom: 12,
    },
    processingEnginePulseLabelText: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.textSecondary,
      textAlign: "center",
    },
    extractedResponseDataCanvasLayout: {
      width: "100%",
    },
    metaInformationRowGridContainer: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 16,
    },
    metaExtractedVariableDataCardBox: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    metaInformationCardLabelTitle: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.3,
      marginBottom: 2,
    },
    metaInformationCardExtractedMainHeading: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.text,
    },
    extractedLineItemsListSectionContainer: {
      marginBottom: 18,
    },
    lineItemsSectionLabelHeadingTitle: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.3,
      marginBottom: 6,
    },
    lineItemSimulatedTableRowStrip: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      borderStyle: "dashed",
    },
    lineItemDescriptionText: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
      paddingRight: 12,
    },
    lineItemPriceNumericalMonoText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
    totalAggregatedAmountHighlightBannerBox: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.specialCardBg,
      padding: 14,
      borderRadius: 10,
      marginBottom: 16,
    },
    totalAggregatedLabelTitleText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.specialCardMuted,
    },
    totalAggregatedNumericalMonoValueText: {
      fontSize: 18,
      fontWeight: "900",
      color: colors.specialCardText,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
    workflowCommitActionsFlexRowPanel: {
      flexDirection: "row",
      gap: 10,
      width: "100%",
    },
    workflowCreateExpenseSubmitButton: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: 10,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    workflowCreateExpenseSubmitButtonText: {
      color: colors.primaryText,
      fontSize: 12,
      fontWeight: "600",
    },
    workflowDiscardButtonAction: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardBg,
    },
    workflowDiscardButtonActionText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
    },
  });
}

export default function ReceiptOCR() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [file, setFile] = useState<ActiveFileObject | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [results, setResults] = useState<OcrExtractedResults | null>(null);

  const handleChooseFile = useCallback(async () => {
    try {
      const response = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
      });

      if (response.canceled || !response.assets || response.assets.length === 0) {
        return;
      }

      const nativeAsset = response.assets[0];
      const computedSize = nativeAsset.size 
        ? `${(nativeAsset.size / (1024 * 1024)).toFixed(2)} MB` 
        : "Unknown Size";

      setFile({
        name: nativeAsset.name,
        size: computedSize,
        uri: nativeAsset.uri,
      });
    } catch (error) {
      console.error("Document picking subsystem exception:", error);
      Alert.alert("Upload Error", "Failed to access target file directory.");
    }
  }, []);

  const startScan = useCallback(() => {
    if (!file) return;
    
    setScanning(true);
    setResults(null);
    
    setTimeout(() => {
      setResults({
        vendor: "Amazon.com",
        date: "2024-05-10",
        total: 124.99,
        currency: "USD",
        items: [
          { desc: "Office Supplies", price: 89.99 },
          { desc: "Shipping", price: 35.00 },
        ],
      });
      setScanning(false);
    }, 2500);
  }, [file]);

  const clearWorkspace = useCallback(() => {
    setFile(null);
    setResults(null);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerBlock}>
          <View style={styles.titleInlineFlexRow}>
            <ScanLine size={24} color={colors.primary} style={styles.headerIconMargin} />
            <Text style={styles.moduleTitleHeading}>Receipt & OCR Module</Text>
          </View>
          <Text style={styles.moduleSubtitleText}>
            Automate expense entry by scanning receipts with AI-powered OCR.
          </Text>
        </View>

        <View style={styles.workspaceLayoutSplitMatrixColumn}>
          <View style={[styles.cardSurfaceContainer, styles.dashedBordersLayoutFrame]}>
            {file ? (
              <View style={styles.attachedFileInteractiveWorkspace}>
                <View style={styles.documentIconIsolatedWrapper}>
                  <FileText size={44} color={colors.primary} />
                  <TouchableOpacity 
                    style={styles.clearAttachmentBadgeAbsoluteButton} 
                    onPress={clearWorkspace}
                    activeOpacity={0.7}
                  >
                    <X size={12} color="#ffffff" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.attachedFileNameLabelText} numberOfLines={1}>{file.name}</Text>
                <Text style={styles.attachedFileSizeSubtext}>{file.size}</Text>
                
                <TouchableOpacity 
                  style={[styles.actionProcessingButtonAnchor, scanning ? styles.disabledActionOpacity : null]}
                  onPress={startScan}
                  disabled={scanning}
                  activeOpacity={0.8}
                >
                  {scanning ? (
                    <ActivityIndicator size="small" color={colors.primaryText} style={styles.inlineProcessingIndicatorMargin} />
                  ) : (
                    <ScanLine size={14} color={colors.primaryText} style={styles.inlineProcessingIndicatorMargin} />
                  )}
                  <Text style={styles.actionProcessingButtonLabelText}>
                    {scanning ? "Scanning Receipt..." : "Start AI Scan"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.dropzonePassiveLayoutContent}>
                <View style={styles.uploadIconBackgroundCircleFrame}>
                  <Upload size={22} color={colors.textSecondary} />
                </View>
                <Text style={styles.dropzoneTitleLabelText}>Upload Receipt</Text>
                <Text style={styles.dropzoneInstructionsParagraphText}>Drag and drop or click to browse</Text>
                
                <TouchableOpacity 
                  style={styles.browseButtonActionAnchor}
                  onPress={handleChooseFile}
                  activeOpacity={0.7}
                >
                  <Text style={styles.browseButtonLabelText}>Choose File</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.cardSurfaceContainer}>
            <View style={styles.resultsCardHeaderMetaRow}>
              <CheckCircle2 size={16} color={colors.successText} style={styles.inlineIconMarginRight} />
              <Text style={styles.resultsCardTitleLabelHeading}>Scan Results</Text>
            </View>

            {!results && !scanning && (
              <View style={styles.emptyStateFallbackContainerCentered}>
                <Text style={styles.emptyStateParagraphLabelText}>
                  Upload and scan a receipt to see extracted data.
                </Text>
              </View>
            )}

            {scanning && (
              <View style={styles.processingActivityIndicatorContainer}>
                <ActivityIndicator size="small" color={colors.primary} style={styles.processingActivityIndicatorSpacer} />
                <Text style={styles.processingEnginePulseLabelText}>
                  Analyzing document structure and extracting text...
                </Text>
              </View>
            )}

            {results && (
              <View style={styles.extractedResponseDataCanvasLayout}>
                <View style={styles.metaInformationRowGridContainer}>
                  <View style={styles.metaExtractedVariableDataCardBox}>
                    <Text style={styles.metaInformationCardLabelTitle}>Vendor</Text>
                    <Text style={styles.metaInformationCardExtractedMainHeading} numberOfLines={1}>
                      {results.vendor}
                    </Text>
                  </View>
                  <View style={styles.metaExtractedVariableDataCardBox}>
                    <Text style={styles.metaInformationCardLabelTitle}>Date</Text>
                    <Text style={styles.metaInformationCardExtractedMainHeading} numberOfLines={1}>
                      {results.date}
                    </Text>
                  </View>
                </View>

                <View style={styles.extractedLineItemsListSectionContainer}>
                  <Text style={styles.lineItemsSectionLabelHeadingTitle}>Items Extracted</Text>
                  {results.items.map((item, i) => (
                    <View key={i} style={styles.lineItemSimulatedTableRowStrip}>
                      <Text style={styles.lineItemDescriptionText} numberOfLines={1}>{item.desc}</Text>
                      <Text style={styles.lineItemPriceNumericalMonoText}>${item.price.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.totalAggregatedAmountHighlightBannerBox}>
                  <Text style={styles.totalAggregatedLabelTitleText}>Total Amount</Text>
                  <Text style={styles.totalAggregatedNumericalMonoValueText}>
                    ${results.total.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.workflowCommitActionsFlexRowPanel}>
                  <TouchableOpacity style={styles.workflowCreateExpenseSubmitButton} activeOpacity={0.8}>
                    <Text style={styles.workflowCreateExpenseSubmitButtonText}>Create Expense</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.workflowDiscardButtonAction} onPress={clearWorkspace} activeOpacity={0.7}>
                    <Text style={styles.workflowDiscardButtonActionText}>Discard</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}