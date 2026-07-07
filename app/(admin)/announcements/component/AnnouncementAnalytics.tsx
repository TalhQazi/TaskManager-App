import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  SafeAreaView
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

const { height } = Dimensions.get("window");

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
  const themeContext = useTheme() as any;

  const activeColors = useMemo(() => {
    if (themeContext?.colors) {
      return {
        ...themeContext.colors,
        text: "#ffffff"
      };
    }
    const uiTheme = themeContext?.uiTheme;
    if (uiTheme) {
      const isDark = uiTheme.theme === "dark" || uiTheme.theme === "metallic-elite";
      return {
        background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
        surface: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
        primary: uiTheme.customColors?.primary || "#b45309",
        border: uiTheme.panelColors?.borderColor || (isDark ? "#334155" : "#e2e8f0"),
        text: "#ffffff",
        textSecondary: isDark ? "#94a3b8" : "#64748b"
      };
    }
    return {
      background: "#f8fafc",
      surface: "#ffffff",
      primary: "#b45309",
      border: "#e2e8f0",
      text: "#ffffff",
      textSecondary: "#64748b"
    };
  }, [themeContext]);
  
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
        <SafeAreaView style={[s(styles.formWindowCardSurfaceExtendedHeight), { backgroundColor: activeColors.surface }]}>
          
          <View style={[s(styles.pickerContentHeaderBarTopRow), { borderBottomColor: activeColors.border }]}>
            <View style={s(styles.headerTitleContainerStrip)}>
              <TrendingUp size={20} color={activeColors.primary} style={s(styles.inlineMarginRightSpacing)} />
              <Text style={[s(styles.pickerContentHeaderTitleHeadingText), { color: activeColors.text }]} numberOfLines={1}>
                Analytics: {announcement?.title || "Loading..."}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s(styles.pickerCloseCrossTouchTargetBoundary)}>
              <X size={18} color={activeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={s(styles.loaderCentralEngineIndicatorSpacingCanvas)}>
              <ActivityIndicator size="large" color={activeColors.primary} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s(styles.analyticsScrollableCanvas)}>
              
              <View style={s(styles.statsSummaryGridDashboardStrip)}>
                <View style={[s(styles.statMetricDataCard), { backgroundColor: activeColors.background, borderColor: activeColors.border }]}>
                  <View style={s(styles.statMetricCardHeaderWrapperRow)}>
                    <Users size={14} color={activeColors.textSecondary} />
                    <Text style={[s(styles.statMetricLabelMetaText), { color: activeColors.textSecondary }]}>Recipients</Text>
                  </View>
                  <Text style={[s(styles.statMetricNumericValueText), { color: activeColors.text }]}>
                    {announcement?.sentCount || 0}
                  </Text>
                </View>

                <View style={[s(styles.statMetricDataCard), { backgroundColor: activeColors.background, borderColor: activeColors.border }]}>
                  <View style={s(styles.statMetricCardHeaderWrapperRow)}>
                    <Eye size={14} color={activeColors.primary} />
                    <Text style={[s(styles.statMetricLabelMetaText), { color: activeColors.textSecondary }]}>Read Rate</Text>
                  </View>
                  <Text style={[s(styles.statMetricNumericValueText), { color: activeColors.primary }]}>
                    {readPercentage}%
                  </Text>
                  <Text style={[s(styles.statMetricSubtextMetaValue), { color: activeColors.textSecondary }]}>
                    {announcement?.readCount || 0}/{announcement?.sentCount || 0}
                  </Text>
                </View>

                <View style={[s(styles.statMetricDataCard), { backgroundColor: activeColors.background, borderColor: activeColors.border }]}>
                  <View style={s(styles.statMetricCardHeaderWrapperRow)}>
                    <CheckCircle2 size={14} color="#16a34a" />
                    <Text style={[s(styles.statMetricLabelMetaText), { color: activeColors.textSecondary }]}>Acked</Text>
                  </View>
                  <Text style={[s(styles.statMetricNumericValueText), styles.greenAccentText]}>
                    {acknowledgedPercentage}%
                  </Text>
                  <Text style={[s(styles.statMetricSubtextMetaValue), { color: activeColors.textSecondary }]}>
                    {announcement?.acknowledgedCount || 0}/{announcement?.sentCount || 0}
                  </Text>
                </View>
              </View>

              <View style={[s(styles.progressBarGroupCardWrapper), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                <View style={s(styles.progressBarUnitContainer)}>
                  <View style={s(styles.progressBarLabelsInlineRow)}>
                    <Text style={[s(styles.progressBarMainTitleText), { color: activeColors.text }]}>Read Progress</Text>
                    <Text style={[s(styles.progressBarPercentageValueText), { color: activeColors.textSecondary }]}>{readPercentage}%</Text>
                  </View>
                  <View style={[s(styles.progressBarTrackBackground), { backgroundColor: activeColors.background }]}>
                    <View style={[styles.progressBarFilledFill, { width: `${readPercentage}%`, backgroundColor: activeColors.primary }]} />
                  </View>
                </View>

                <View style={s(styles.progressBarUnitContainer)}>
                  <View style={s(styles.progressBarLabelsInlineRow)}>
                    <Text style={[s(styles.progressBarMainTitleText), { color: activeColors.text }]}>Acknowledgement Progress</Text>
                    <Text style={[s(styles.progressBarPercentageValueText), { color: activeColors.textSecondary }]}>{acknowledgedPercentage}%</Text>
                  </View>
                  <View style={[s(styles.progressBarTrackBackground), { backgroundColor: activeColors.background }]}>
                    <View style={[styles.progressBarFilledFill, { width: `${acknowledgedPercentage}%`, backgroundColor: "#16a34a" }]} />
                  </View>
                </View>
              </View>

              <View style={s(styles.userDetailsSectionModuleFrame)}>
                <Text style={[s(styles.userDetailsSectionModuleTitle), { color: activeColors.text }]}>User Details</Text>
                
                {userList.length === 0 ? (
                  <View style={[s(styles.emptyTableRowFallbackContainer), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                    <Text style={[s(styles.emptyTableRowFallbackText), { color: activeColors.textSecondary }]}>No data available</Text>
                  </View>
                ) : (
                  userList.map((user) => (
                    <View key={user.userId} style={[s(styles.userRowLogEntryItemCard), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                      <View style={s(styles.userRowEntryTopFlexLine)}>
                        <View style={s(styles.userProfileIdentityColumn)}>
  <Text style={[s(styles.userProfileFullNameDisplayLabelText), { color: activeColors.text }]} numberOfLines={1}>
    {user.userName}
  </Text>
  <Text style={[s(styles.userProfileSystemRoleText), { color: activeColors.textSecondary }]}>
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

                      <View style={[s(styles.chronologyTimeStampsBlockGridRow), { borderTopColor: activeColors.border }]}>
                        <Text style={[s(styles.chronologyTimestampLabelText), { color: activeColors.textSecondary }]}>
                          Read: {user.readAt ? new Date(user.readAt).toLocaleDateString() : "-"}
                        </Text>
                        <Text style={[s(styles.chronologyTimestampLabelText), { color: activeColors.textSecondary }]}>
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

const styles = StyleSheet.create({
  pickerOverlayModalSheetBlurWindow: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  formWindowCardSurfaceExtendedHeight: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: "100%",
    maxHeight: height * 0.85,
  },
  pickerContentHeaderBarTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitleContainerStrip: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  inlineMarginRightSpacing: {
    marginRight: 6,
  },
  pickerContentHeaderTitleHeadingText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  pickerCloseCrossTouchTargetBoundary: {
    padding: 4,
  },
  loaderCentralEngineIndicatorSpacingCanvas: {
    paddingVertical: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  analyticsScrollableCanvas: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  statsSummaryGridDashboardStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 16,
  },
  statMetricDataCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 10,
    minHeight: 74,
    justifyContent: "center",
  },
  statMetricCardHeaderWrapperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  statMetricLabelMetaText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
  },
  statMetricNumericValueText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  statMetricSubtextMetaValue: {
    fontSize: 9,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 1,
  },
  greenAccentText: {
    color: "#16a34a",
  },
  progressBarGroupCardWrapper: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  progressBarUnitContainer: {
    width: "100%",
  },
  progressBarLabelsInlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  progressBarMainTitleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  progressBarPercentageValueText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  progressBarTrackBackground: {
    height: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFilledFill: {
    height: "100%",
    borderRadius: 4,
  },
  userDetailsSectionModuleFrame: {
    gap: 10,
  },
  userDetailsSectionModuleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 2,
  },
  emptyTableRowFallbackContainer: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyTableRowFallbackText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  userRowLogEntryItemCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  userRowEntryTopFlexLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  userProfileIdentityColumn: {
    flex: 1,
    marginRight: 8,
  },
  userProfileFullNameDisplayLabelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
  },
  userProfileSystemRoleText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  badgesGroupFlexLayoutHorizontalRow: {
    flexDirection: "row",
    gap: 4,
  },
  inlineBadgeBoxFrame: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
  },
  readBadgeBg: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  readBadgeText: {
    color: "#b45309",
  },
  ackedBadgeBg: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  ackedBadgeText: {
    color: "#16a34a",
  },
  inlineBadgeInnerText: {
    fontSize: 9,
    fontWeight: "700",
  },
  chronologyTimeStampsBlockGridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  chronologyTimestampLabelText: {
    fontSize: 11,
    color: "#94a3b8",
  },
});