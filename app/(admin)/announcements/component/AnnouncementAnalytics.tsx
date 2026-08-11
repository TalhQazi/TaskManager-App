import React, { useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  useWindowDimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  Users, 
  Eye, 
  CheckCircle2, 
  X 
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { s } from "@/util/styles";
import { useTheme } from "@/contexts/ThemeContext";

interface UserLog {
  userId: string;
  userName: string;
  userRole: string;
  readAt: string | null;
  acknowledgedAt: string | null;
  acknowledged: boolean;
}

interface AnnouncementMeta {
  title: string;
  sentCount: number;
  readCount: number;
  acknowledgedCount: number;
}

interface AnalyticsApiResponse {
  announcement?: AnnouncementMeta;
  userList?: UserLog[];
  readPercentage?: number;
  acknowledgedPercentage?: number;
}

interface AnnouncementAnalyticsProps {
  isOpen: boolean;
  onClose: () => void;
  announcementId: string;
}

export default function AnnouncementAnalytics({
  isOpen,
  onClose,
  announcementId,
}: AnnouncementAnalyticsProps) {
  const { width, height } = useWindowDimensions();
  const wp = useCallback((percentage: number) => (width * percentage) / 100, [width]);
  const hp = useCallback((percentage: number) => (height * percentage) / 100, [height]);
  const isTablet = width >= 768;

  const { uiTheme } = useTheme() as any;

  const isLightTheme = useMemo(() => {
    return (
      uiTheme?.theme?.includes("crystal") ||
      uiTheme?.panelColors?.dashboardTextColor === "#000000"
    );
  }, [uiTheme]);

  const activeColors = useMemo(() => {
    const bg = uiTheme?.panelColors?.dashboardBackground || (isLightTheme ? "#f8fafc" : "#09090b");
    const surface = uiTheme?.panelColors?.dashboardCardBackground || (isLightTheme ? "#ffffff" : "#141417");
    const textColor = uiTheme?.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#f4f4f5");
    const textSecondary = isLightTheme ? "#64748b" : "#9ca3af";
    const border = uiTheme?.panelColors?.borderColor || (isLightTheme ? "#e2e8f0" : "rgba(255, 255, 255, 0.08)");
    const primary = uiTheme?.customColors?.primary || "#b45309";
    const inputBg = isLightTheme ? "#f1f5f9" : "rgba(255, 255, 255, 0.04)";

    return {
      background: bg,
      surface: surface,
      text: textColor,
      textSecondary: textSecondary,
      border: border,
      primary: primary,
      inputBg: inputBg,
      // Solid dark modal colors
      modalBg: "#0f172a",
      modalInputBg: "#1e293b",
      modalText: "#f8fafc",
      modalTextSecondary: "#94a3b8",
      modalBorder: "rgba(255, 255, 255, 0.12)",
    };
  }, [uiTheme, isLightTheme]);

  const styles = useMemo(
    () => createStyles(activeColors, wp, hp, isTablet, height),
    [activeColors, wp, hp, isTablet, height]
  );

  const { data, isLoading } = useQuery<AnalyticsApiResponse>({
    queryKey: ["announcement-analytics", announcementId],
    queryFn: async () => {
      const res = await apiFetch<any>(`/api/announcements/${announcementId}/analytics`);
      return res as AnalyticsApiResponse;
    },
    enabled: isOpen,
  });

  const announcement = data?.announcement;
  const userList = data?.userList || [];
  const readPercentage = data?.readPercentage || 0;
  const acknowledgedPercentage = data?.acknowledgedPercentage || 0;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isOpen}
      onRequestClose={onClose}
    >
      <View style={s(styles.pickerOverlayModalSheetBlurWindow)}>
        <SafeAreaView style={[s(styles.formWindowCardSurfaceExtendedHeight), { backgroundColor: activeColors.modalBg }]}>
          
          <View style={[s(styles.pickerContentHeaderBarTopRow), { borderBottomColor: activeColors.modalBorder }]}>
            <View style={s(styles.headerTitleContainerStrip)}>
              <TrendingUp size={20} color={activeColors.primary} style={s(styles.inlineMarginRightSpacing)} />
              <Text style={[s(styles.pickerContentHeaderTitleHeadingText), { color: activeColors.modalText }]} numberOfLines={1}>
                Analytics: {announcement?.title || "Loading..."}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s(styles.pickerCloseCrossTouchTargetBoundary)} activeOpacity={0.7}>
              <X size={18} color={activeColors.modalTextSecondary} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={s(styles.loaderCentralEngineIndicatorSpacingCanvas)}>
              <ActivityIndicator size="large" color={activeColors.primary} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s(styles.analyticsScrollableCanvas)}>
              
              <View style={s(styles.statsSummaryGridDashboardStrip)}>
                <View style={[s(styles.statMetricDataCard), { backgroundColor: activeColors.modalInputBg, borderColor: activeColors.modalBorder }]}>
                  <View style={s(styles.statMetricCardHeaderWrapperRow)}>
                    <Users size={14} color={activeColors.modalTextSecondary} />
                    <Text style={[s(styles.statMetricLabelMetaText), { color: activeColors.modalTextSecondary }]}>Recipients</Text>
                  </View>
                  <Text style={[s(styles.statMetricNumericValueText), { color: activeColors.modalText }]}>
                    {announcement?.sentCount || 0}
                  </Text>
                </View>

                <View style={[s(styles.statMetricDataCard), { backgroundColor: activeColors.modalInputBg, borderColor: activeColors.modalBorder }]}>
                  <View style={s(styles.statMetricCardHeaderWrapperRow)}>
                    <Eye size={14} color={activeColors.primary} />
                    <Text style={[s(styles.statMetricLabelMetaText), { color: activeColors.modalTextSecondary }]}>Read Rate</Text>
                  </View>
                  <Text style={[s(styles.statMetricNumericValueText), { color: activeColors.primary }]}>
                    {readPercentage}%
                  </Text>
                  <Text style={[s(styles.statMetricSubtextMetaValue), { color: activeColors.modalTextSecondary }]}>
                    {announcement?.readCount || 0}/{announcement?.sentCount || 0}
                  </Text>
                </View>

                <View style={[s(styles.statMetricDataCard), { backgroundColor: activeColors.modalInputBg, borderColor: activeColors.modalBorder }]}>
                  <View style={s(styles.statMetricCardHeaderWrapperRow)}>
                    <CheckCircle2 size={14} color="#16a34a" />
                    <Text style={[s(styles.statMetricLabelMetaText), { color: activeColors.modalTextSecondary }]}>Acked</Text>
                  </View>
                  <Text style={[s(styles.statMetricNumericValueText), styles.greenAccentText]}>
                    {acknowledgedPercentage}%
                  </Text>
                  <Text style={[s(styles.statMetricSubtextMetaValue), { color: activeColors.modalTextSecondary }]}>
                    {announcement?.acknowledgedCount || 0}/{announcement?.sentCount || 0}
                  </Text>
                </View>
              </View>

              <View style={[s(styles.progressBarGroupCardWrapper), { backgroundColor: activeColors.modalInputBg, borderColor: activeColors.modalBorder }]}>
                <View style={s(styles.progressBarUnitContainer)}>
                  <View style={s(styles.progressBarLabelsInlineRow)}>
                    <Text style={[s(styles.progressBarMainTitleText), { color: activeColors.modalText }]}>Read Progress</Text>
                    <Text style={[s(styles.progressBarPercentageValueText), { color: activeColors.modalTextSecondary }]}>{readPercentage}%</Text>
                  </View>
                  <View style={[s(styles.progressBarTrackBackground), { backgroundColor: "rgba(0, 0, 0, 0.3)" }]}>
                    <View style={[styles.progressBarFilledFill, { width: `${readPercentage}%`, backgroundColor: activeColors.primary }]} />
                  </View>
                </View>

                <View style={s(styles.progressBarUnitContainer)}>
                  <View style={s(styles.progressBarLabelsInlineRow)}>
                    <Text style={[s(styles.progressBarMainTitleText), { color: activeColors.modalText }]}>Acknowledgement Progress</Text>
                    <Text style={[s(styles.progressBarPercentageValueText), { color: activeColors.modalTextSecondary }]}>{acknowledgedPercentage}%</Text>
                  </View>
                  <View style={[s(styles.progressBarTrackBackground), { backgroundColor: "rgba(0, 0, 0, 0.3)" }]}>
                    <View style={[styles.progressBarFilledFill, { width: `${acknowledgedPercentage}%`, backgroundColor: "#16a34a" }]} />
                  </View>
                </View>
              </View>

              <View style={s(styles.userDetailsSectionModuleFrame)}>
                <Text style={[s(styles.userDetailsSectionModuleTitle), { color: activeColors.modalText }]}>User Details</Text>
                
                {userList.length === 0 ? (
                  <View style={[s(styles.emptyTableRowFallbackContainer), { backgroundColor: activeColors.modalInputBg, borderColor: activeColors.modalBorder }]}>
                    <Text style={[s(styles.emptyTableRowFallbackText), { color: activeColors.modalTextSecondary }]}>No data available</Text>
                  </View>
                ) : (
                  userList.map((user) => (
                    <View key={user.userId} style={[s(styles.userRowLogEntryItemCard), { backgroundColor: activeColors.modalInputBg, borderColor: activeColors.modalBorder }]}>
                      <View style={s(styles.userRowEntryTopFlexLine)}>
                        <View style={s(styles.userProfileIdentityColumn)}>
                          <Text style={[s(styles.userProfileFullNameDisplayLabelText), { color: activeColors.modalText }]} numberOfLines={1}>
                            {user.userName}
                          </Text>
                          <Text style={[s(styles.userProfileSystemRoleText), { color: activeColors.modalTextSecondary }]}>
                            {user.userRole ?? ""}
                          </Text>
                        </View>
                        
                        <View style={s(styles.badgesGroupFlexLayoutHorizontalRow)}>
                          {user.readAt && (
                            <View style={s(styles.inlineBadgeBoxFrame, styles.readBadgeBg)}>
                              <Text style={s(styles.inlineBadgeInnerText, styles.readBadgeText)}>Read</Text>
                            </View>
                          )}
                          {user.acknowledged && (
                            <View style={s(styles.inlineBadgeBoxFrame, styles.ackedBadgeBg)}>
                              <Text style={s(styles.inlineBadgeInnerText, styles.ackedBadgeText)}>Acked</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={[s(styles.chronologyTimeStampsBlockGridRow), { borderTopColor: activeColors.modalBorder }]}>
                        <Text style={[s(styles.chronologyTimestampLabelText), { color: activeColors.modalTextSecondary }]}>
                          Read: {user.readAt ? new Date(user.readAt).toLocaleDateString() : "-"}
                        </Text>
                        <Text style={[s(styles.chronologyTimestampLabelText), { color: activeColors.modalTextSecondary }]}>
                          Acked: {user.acknowledgedAt ? new Date(user.acknowledgedAt).toLocaleDateString() : "-"}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

            </ScrollView>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const createStyles = (
  colors: any,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number,
  isTablet: boolean,
  windowHeight: number
) =>
  StyleSheet.create({
    pickerOverlayModalSheetBlurWindow: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      justifyContent: "flex-end",
    },
    formWindowCardSurfaceExtendedHeight: {
      borderTopLeftRadius: wp(5),
      borderTopRightRadius: wp(5),
      width: "100%",
      maxHeight: windowHeight * 0.85,
    },
    pickerContentHeaderBarTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      paddingHorizontal: wp(5),
      paddingVertical: hp(2),
    },
    headerTitleContainerStrip: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: wp(3),
    },
    inlineMarginRightSpacing: {
      marginRight: wp(1.5),
    },
    pickerContentHeaderTitleHeadingText: {
      fontSize: isTablet ? 17 : 15,
      fontWeight: "700",
      flex: 1,
    },
    pickerCloseCrossTouchTargetBoundary: {
      padding: wp(1),
    },
    loaderCentralEngineIndicatorSpacingCanvas: {
      paddingVertical: hp(8),
      alignItems: "center",
      justifyContent: "center",
    },
    analyticsScrollableCanvas: {
      paddingHorizontal: wp(4.2),
      paddingTop: hp(2),
      paddingBottom: hp(5),
    },
    statsSummaryGridDashboardStrip: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: wp(2),
      marginBottom: hp(2),
    },
    statMetricDataCard: {
      flex: 1,
      borderWidth: 1,
      borderRadius: wp(2.5),
      padding: wp(2.5),
      minHeight: hp(9),
      justifyContent: "center",
    },
    statMetricCardHeaderWrapperRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1),
      marginBottom: hp(0.3),
    },
    statMetricLabelMetaText: {
      fontSize: isTablet ? 11 : 10,
      fontWeight: "600",
    },
    statMetricNumericValueText: {
      fontSize: isTablet ? 20 : 18,
      fontWeight: "800",
    },
    statMetricSubtextMetaValue: {
      fontSize: 9,
      fontWeight: "500",
      marginTop: hp(0.2),
    },
    greenAccentText: {
      color: "#16a34a",
    },
    progressBarGroupCardWrapper: {
      borderWidth: 1,
      borderRadius: wp(3),
      padding: wp(3.5),
      gap: hp(1.5),
      marginBottom: hp(2),
    },
    progressBarUnitContainer: {
      width: "100%",
    },
    progressBarLabelsInlineRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: hp(0.5),
    },
    progressBarMainTitleText: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "600",
    },
    progressBarPercentageValueText: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: "600",
    },
    progressBarTrackBackground: {
      height: hp(1),
      borderRadius: 4,
      overflow: "hidden",
    },
    progressBarFilledFill: {
      height: "100%",
      borderRadius: 4,
    },
    userDetailsSectionModuleFrame: {
      gap: hp(1.2),
    },
    userDetailsSectionModuleTitle: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: "700",
      marginBottom: hp(0.3),
    },
    emptyTableRowFallbackContainer: {
      borderWidth: 1,
      borderRadius: wp(2),
      paddingVertical: hp(2.5),
      alignItems: "center",
    },
    emptyTableRowFallbackText: {
      fontSize: isTablet ? 13 : 12,
    },
    userRowLogEntryItemCard: {
      borderWidth: 1,
      borderRadius: wp(2.5),
      padding: wp(3),
      gap: hp(1),
    },
    userRowEntryTopFlexLine: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    userProfileIdentityColumn: {
      flex: 1,
      marginRight: wp(2),
    },
    userProfileFullNameDisplayLabelText: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: "700",
    },
    userProfileSystemRoleText: {
      fontSize: isTablet ? 12 : 11,
      marginTop: hp(0.2),
    },
    badgesGroupFlexLayoutHorizontalRow: {
      flexDirection: "row",
      gap: wp(1),
    },
    inlineBadgeBoxFrame: {
      borderRadius: wp(1),
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.3),
      borderWidth: 0.5,
    },
    readBadgeBg: {
      backgroundColor: "rgba(245, 158, 11, 0.15)",
      borderColor: "rgba(245, 158, 11, 0.3)",
    },
    readBadgeText: {
      color: "#fbbf24",
    },
    ackedBadgeBg: {
      backgroundColor: "rgba(34, 197, 94, 0.15)",
      borderColor: "rgba(34, 197, 94, 0.3)",
    },
    ackedBadgeText: {
      color: "#4ade80",
    },
    inlineBadgeInnerText: {
      fontSize: 9,
      fontWeight: "700",
    },
    chronologyTimeStampsBlockGridRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1,
      paddingTop: hp(1),
    },
    chronologyTimestampLabelText: {
      fontSize: isTablet ? 12 : 11,
    },
  });