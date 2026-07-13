import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from "react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  FileText,
  CheckCircle2,
} from "lucide-react-native";
import { s } from "@/util/styles";

interface TaxAssessment {
  status: string;
}

interface LienItem {
  _id: string;
}

interface TitleRecord {
  _id: string;
  property?: {
    name: string;
  };
  parcelNumber: string;
  ownerName: string;
  liens?: LienItem[];
  lastTaxAssessment?: TaxAssessment;
  status: string;
}

interface ApiResponse<T> {
  success: boolean;
  items?: T[];
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
    successBg:        isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.08)",
    successBorder:    isDark ? "rgba(16, 185, 129, 0.3)" : "rgba(16, 185, 129, 0.15)",
    successText:      isDark ? "#34D399" : "#059669",
    warningBg:        isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.08)",
    warningBorder:    isDark ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.15)",
    warningText:      isDark ? "#F59E0B" : "#D97706",
    dangerBg:         isDark ? "rgba(239, 68, 68, 0.15)" : "#FEF2F2",
    dangerBorder:     isDark ? "rgba(239, 68, 68, 0.3)" : "#FEE2E2",
    dangerText:       isDark ? "#F87171" : "#EF4444",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    safeAreaContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollViewCanvas: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    moduleHeaderBlock: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerLayoutTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    moduleTitleWrapper: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 8,
    },
    moduleTitleIcon: {
      marginRight: 8,
    },
    moduleTitleHeading: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    headerControlPanel: {
      flexDirection: "row",
      gap: 8,
    },
    actionButtonOutline: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
      padding: 10,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    processingSpinnerOpacity: {
      opacity: 0.4,
    },
    actionButtonPrimary: {
      flexDirection: "row",
      backgroundColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 8,
      alignItems: "center",
      gap: 6,
    },
    actionButtonPrimaryText: {
      color: colors.primaryText,
      fontSize: 13,
      fontWeight: "600",
    },
    moduleSubtitleParagraph: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    summaryKpiGridRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 12,
      marginBottom: 20,
    },
    kpiCardFrame: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    kpiClearBackground: {
      backgroundColor: colors.successBg,
      borderColor: colors.successBorder,
    },
    kpiEncumberedBackground: {
      backgroundColor: colors.warningBg,
      borderColor: colors.warningBorder,
    },
    kpiIconWrapper: {
      padding: 8,
      borderRadius: 10,
      width: 38,
      height: 38,
      justifyContent: "center",
      alignItems: "center",
    },
    kpiClearIconBg: {
      backgroundColor: colors.successBorder,
    },
    kpiEncumberedIconBg: {
      backgroundColor: colors.warningBorder,
    },
    kpiTextColumn: {
      flex: 1,
    },
    kpiMetaTextLabel: {
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    kpiClearTextTheme: {
      color: colors.successText,
    },
    kpiEncumberedTextTheme: {
      color: colors.warningText,
    },
    kpiNumericHeading: {
      fontSize: 20,
      fontWeight: "900",
      color: colors.text,
      marginTop: 1,
    },
    registrySectionTitleStrip: {
      marginHorizontal: 16,
      marginBottom: 8,
      paddingTop: 2,
    },
    registrySectionHeading: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    centerSpinnerState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 44,
    },
    emptyStateContainerBox: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginHorizontal: 16,
      paddingVertical: 48,
      paddingHorizontal: 24,
      alignItems: "center",
    },
    emptyStateParagraphText: {
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: "italic",
      textAlign: "center",
      lineHeight: 18,
    },
    registryTabularCanvas: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: "hidden",
    },
    tableHeaderRowConfig: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.borderLight,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tableHeaderLabelText: {
      fontSize: 9,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.2,
    },
    colPropertyDetails: {
      flex: 1.6,
      paddingRight: 4,
    },
    colLienDetails: {
      flex: 1.0,
      paddingRight: 4,
    },
    colTaxDetails: {
      flex: 1.0,
      paddingRight: 4,
    },
    colStatusDetails: {
      flex: 0.9,
      alignItems: "flex-end",
    },
    textAlignmentRight: {
      textAlign: "right",
    },
    tableBodyRowConfig: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    propertyNameLabelText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    parcelNumberMonoText: {
      fontSize: 10,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
      color: colors.textSecondary,
      marginBottom: 2,
    },
    ownerRecordNameText: {
      fontSize: 11,
      color: colors.textMuted,
    },
    lienAlertBadgeFrame: {
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 2,
      alignSelf: "flex-start",
    },
    lienAlertBadgeText: {
      fontSize: 9,
      fontWeight: "700",
      color: colors.dangerText,
    },
    lienClearBadgeFrame: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.successBorder,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      alignSelf: "flex-start",
    },
    lienClearBadgeText: {
      fontSize: 9,
      fontWeight: "700",
      color: colors.successText,
    },
    taxStatusBadgeFrame: {
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 2,
      alignSelf: "flex-start",
    },
    taxStatusPaidBg: {
      backgroundColor: colors.borderLight,
      borderColor: colors.border,
    },
    taxStatusPendingBg: {
      backgroundColor: colors.dangerBg,
      borderColor: colors.dangerBorder,
    },
    taxStatusBadgeText: {
      fontSize: 9,
      fontWeight: "700",
    },
    taxStatusPaidText: {
      color: colors.textSecondary,
    },
    taxStatusPendingText: {
      color: colors.dangerText,
    },
    registryStatusSolidBadge: {
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      minWidth: 64,
      alignItems: "center",
    },
    statusClearBg: {
      backgroundColor: colors.successText,
    },
    statusEncumberedBg: {
      backgroundColor: colors.warningText,
    },
    registryStatusSolidBadgeText: {
      color: colors.primaryText,
      fontSize: 9,
      fontWeight: "700",
      textTransform: "uppercase",
    },
  });
}

export default function TitleMonitoring() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [titleRecords, setTitleRecords] = useState<TitleRecord[]>([]);
  const [isRegistryLoading, setIsRegistryLoading] = useState<boolean>(true);

  const initializeTitleRegistry = useCallback(async () => {
    try {
      setIsRegistryLoading(true);
      const fetchResponse = await apiFetch<ApiResponse<TitleRecord>>("/api/atlasbook/titles");
      if (fetchResponse?.success) {
        setTitleRecords(fetchResponse.items || []);
      }
    } catch (apiError) {
      console.error(apiError);
    } finally {
      setIsRegistryLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeTitleRegistry();
  }, [initializeTitleRegistry]);

  const clearTitlesCount = useMemo(() => {
    return titleRecords.filter((record) => record.status === "Clear").length;
  }, [titleRecords]);

  const encumberedTitlesCount = useMemo(() => {
    return titleRecords.filter((record) => record.status !== "Clear").length;
  }, [titleRecords]);

  return (
    <SafeAreaView style={s(styles.safeAreaContainer)}>
      <View style={s(styles.moduleHeaderBlock)}>
        <View style={s(styles.headerLayoutTopRow)}>
          <View style={s(styles.moduleTitleWrapper)}>
            <ShieldCheck size={24} color={colors.primary} style={s(styles.moduleTitleIcon)} />
            <Text style={s(styles.moduleTitleHeading)} numberOfLines={2}>Title & Lien {"\n"}Monitoring</Text>
          </View>
          <View style={s(styles.headerControlPanel)}>
            <TouchableOpacity 
              style={s(styles.actionButtonOutline)} 
              onPress={initializeTitleRegistry} 
              disabled={isRegistryLoading}
            >
              <RefreshCw size={16} color={colors.textSecondary} style={s(isRegistryLoading && styles.processingSpinnerOpacity)} />
            </TouchableOpacity>
            <TouchableOpacity style={s(styles.actionButtonPrimary)}>
              <FileText size={16} color={colors.primaryText} />
              <Text style={s(styles.actionButtonPrimaryText)}>Order Title Report</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={s(styles.moduleSubtitleParagraph)}>
          Monitor property titles, recorded liens, and municipal tax assessments.
        </Text>
      </View>

      <View style={s(styles.summaryKpiGridRow)}>
        <View style={s([styles.kpiCardFrame, styles.kpiClearBackground])}>
          <View style={s([styles.kpiIconWrapper, styles.kpiClearIconBg])}>
            <CheckCircle2 size={22} color={colors.successText} />
          </View>
          <View style={s(styles.kpiTextColumn)}>
            <Text style={s([styles.kpiMetaTextLabel, styles.kpiClearTextTheme])}>Clear Titles</Text>
            <Text style={s(styles.kpiNumericHeading)}>{clearTitlesCount}</Text>
          </View>
        </View>

        <View style={s([styles.kpiCardFrame, styles.kpiEncumberedBackground])}>
          <View style={s([styles.kpiIconWrapper, styles.kpiEncumberedIconBg])}>
            <AlertCircle size={22} color={colors.warningText} />
          </View>
          <View style={s(styles.kpiTextColumn)}>
            <Text style={s([styles.kpiMetaTextLabel, styles.kpiEncumberedTextTheme])}>Encumbered</Text>
            <Text style={s(styles.kpiNumericHeading)}>{encumberedTitlesCount}</Text>
          </View>
        </View>
      </View>

      <View style={s(styles.registrySectionTitleStrip)}>
        <Text style={s(styles.registrySectionHeading)}>Title Registry</Text>
      </View>

      {isRegistryLoading ? (
        <View style={s(styles.centerSpinnerState)}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : titleRecords.length === 0 ? (
        <View style={s(styles.emptyStateContainerBox)}>
          <Text style={s(styles.emptyStateParagraphText)}>
            No property title records found. Start by ordering a title report.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s(styles.scrollViewCanvas)} showsVerticalScrollIndicator={false}>
          <View style={s(styles.registryTabularCanvas)}>
            <View style={s(styles.tableHeaderRowConfig)}>
              <Text style={s([styles.tableHeaderLabelText, styles.colPropertyDetails])}>Property / Owner</Text>
              <Text style={s([styles.tableHeaderLabelText, styles.colLienDetails])}>Active Liens</Text>
              <Text style={s([styles.tableHeaderLabelText, styles.colTaxDetails])}>Tax Status</Text>
              <Text style={s([styles.tableHeaderLabelText, styles.colStatusDetails, styles.textAlignmentRight])}>Status</Text>
            </View>

            {titleRecords.map((record, index) => {
              const totalActiveLiensCount = record.liens?.length || 0;
              const currentTaxAssessmentStatus = record.lastTaxAssessment?.status || "Pending";
              const isTaxPaid = currentTaxAssessmentStatus === "Paid";
              const isClear = record.status === "Clear";
              
              return (
                <View key={record._id || String(index)} style={s(styles.tableBodyRowConfig)}>
                  <View style={s(styles.colPropertyDetails)}>
                    <Text style={s(styles.propertyNameLabelText)} numberOfLines={1}>
                      {record.property?.name || "Unknown Property"}
                    </Text>
                    <Text style={s(styles.parcelNumberMonoText)} numberOfLines={1}>
                      {record.parcelNumber}
                    </Text>
                    <Text style={s(styles.ownerRecordNameText)} numberOfLines={1}>
                      {record.ownerName}
                    </Text>
                  </View>

                  <View style={s(styles.colLienDetails)}>
                    {totalActiveLiensCount > 0 ? (
                      <View style={s(styles.lienAlertBadgeFrame)}>
                        <Text style={s(styles.lienAlertBadgeText)}>{totalActiveLiensCount} Liens</Text>
                      </View>
                    ) : (
                      <View style={s(styles.lienClearBadgeFrame)}>
                        <Text style={s(styles.lienClearBadgeText)}>None</Text>
                      </View>
                    )}
                  </View>

                  <View style={s(styles.colTaxDetails)}>
                    <View style={s([
                      styles.taxStatusBadgeFrame,
                      isTaxPaid ? styles.taxStatusPaidBg : styles.taxStatusPendingBg,
                    ])}>
                      <Text style={s([
                        styles.taxStatusBadgeText,
                        isTaxPaid ? styles.taxStatusPaidText : styles.taxStatusPendingText,
                      ])}>
                        {currentTaxAssessmentStatus}
                      </Text>
                    </View>
                  </View>

                  <View style={s([styles.colStatusDetails, styles.textAlignmentRight])}>
                    <View style={s([
                      styles.registryStatusSolidBadge,
                      isClear ? styles.statusClearBg : styles.statusEncumberedBg,
                    ])}>
                      <Text style={s(styles.registryStatusSolidBadgeText)} numberOfLines={1}>
                        {record.status}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}