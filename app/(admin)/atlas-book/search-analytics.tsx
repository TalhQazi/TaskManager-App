import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Platform,
  DimensionValue,
} from "react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Search,
  Sparkles,
  ArrowRight,
  Building,
  Users,
  Wallet,
  CreditCard,
  Box,
} from "lucide-react-native";

interface SearchResultItem {
  type: "Property" | "Tenant" | "Account" | "Transaction" | string;
  id?: string;
  _id?: string;
  title: string;
  link: string;
}

interface TrendItem {
  label: string;
  val: string;
}

interface SearchStats {
  propertyCount: number;
  tenantCount: number;
  billCount: number;
  trends: TrendItem[];
}

interface ApiResponse<T> {
  success: boolean;
  items?: T[];
  results?: T[];
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
    inputBg:          isDark ? "#27272A" : "#F8FAFC",
    inputText:        isDark ? "#FFFFFF" : "#000000",
    placeholderText:  isDark ? "#A1A1AA" : "#94A3B8",
    primary:          uiTheme.customColors?.primary || "#3b82f6",
    primaryText:      isDark ? "#09090b" : "#FFFFFF",
    primaryTranslucent: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.05)",
    darkCardBg:       "#0F172A",
    darkCardText:     "#FFFFFF",
    darkCardMuted:    "#94A3B8",
    trendProgressBg:  "#1E293B",
    emeraldBg:        "#10B981",
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
      paddingVertical: 24,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    badgeContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.primaryTranslucent,
      borderRadius: 100,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary,
    },
    moduleTitleHeading: {
      fontSize: 32,
      fontWeight: "900",
      color: colors.text,
      letterSpacing: -1,
      textAlign: "center",
      marginBottom: 8,
    },
    moduleSubtitleText: {
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 22,
      textAlign: "center",
      paddingHorizontal: 12,
    },
    searchBarWrapperCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 6,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
    },
    searchInputFieldContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      height: 48,
      paddingHorizontal: 12,
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      marginRight: 6,
    },
    searchIconLeft: {
      marginRight: 10,
    },
    searchInputFieldText: {
      flex: 1,
      fontSize: 14,
      color: colors.inputText,
      height: "100%",
      padding: 0,
    },
    searchSubmitButton: {
      backgroundColor: colors.primary,
      height: 48,
      paddingHorizontal: 20,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    searchSubmitButtonText: {
      color: colors.primaryText,
      fontSize: 14,
      fontWeight: "700",
    },
    resultsSectionHeaderLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 1.5,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    resultsListStackContainer: {
      gap: 12,
      marginBottom: 32,
    },
    resultRowInteractiveCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    resultRowLeftFlexAnchor: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      paddingRight: 12,
    },
    iconBoxSurface: {
      padding: 10,
      backgroundColor: colors.borderLight,
      borderRadius: 12,
      marginRight: 14,
      justifyContent: "center",
      alignItems: "center",
    },
    resultRowMetaMetaColumn: {
      flex: 1,
    },
    resultBadgeAndIdInlineFlex: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 2,
    },
    typeBadgeOutline: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 1.5,
    },
    typeBadgeOutlineText: {
      fontSize: 9,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
    },
    rowIdentifierText: {
      fontSize: 10,
      color: colors.textMuted,
    },
    resultRowMainTitleLabel: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    emptyStateContainerCenteredDashed: {
      paddingVertical: 40,
      paddingHorizontal: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.borderLight,
      borderRadius: 20,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
    },
    emptyStateParagraphFallbackText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: "italic",
      textAlign: "center",
      marginBottom: 16,
    },
    emptyStateInlineTagsFlexWrapper: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 8,
    },
    emptyStateQuickSearchBadgeButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.cardBg,
    },
    emptyStateQuickSearchBadgeButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    aiAnalyticsDividedGridCanvas: {
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      paddingTop: 28,
      gap: 24,
    },
    aiTextAnalysisSummaryColumn: {
      gap: 8,
    },
    aiHeaderTitleInlineRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    aiHeaderTitleLabelText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.primary,
    },
    aiParagraphParagraphDescText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    trendsDarkDisplayCard: {
      backgroundColor: colors.darkCardBg,
      borderRadius: 20,
      padding: 20,
    },
    trendsCardHeaderMetaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    trendsCardHeaderLabelTitleText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.darkCardMuted,
      textTransform: "uppercase",
      letterSpacing: 1.5,
    },
    trendsPositiveStatusBadge: {
      backgroundColor: colors.emeraldBg,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    trendsPositiveStatusBadgeText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "700",
    },
    trendsMetricStackCanvas: {
      gap: 14,
    },
    trendBarUnitItemBlock: {
      gap: 4,
    },
    trendBarTextLabelsIndicatorRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    trendBarLabelNameText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.darkCardText,
    },
    trendBarPercentageValueText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.darkCardMuted,
    },
    trendProgressBarBackgroundTrack: {
      height: 4,
      backgroundColor: colors.trendProgressBg,
      borderRadius: 10,
      overflow: "hidden",
    },
    trendProgressBarActiveFill: {
      height: "100%",
      backgroundColor: colors.primary,
    },
  });
}

export default function SearchAnalytics() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<SearchStats>({
    propertyCount: 0,
    tenantCount: 0,
    billCount: 0,
    trends: [
      { label: "Properties", val: "0%" },
      { label: "Tenants", val: "0%" },
      { label: "Bills", val: "0%" },
    ],
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [propRes, tenantRes, billsRes] = await Promise.all([
          apiFetch<ApiResponse<any>>("/api/atlasbook/properties"),
          apiFetch<ApiResponse<any>>("/api/atlasbook/tenants"),
          apiFetch<ApiResponse<any>>("/api/atlasbook/bills"),
        ]);
        const pCount = propRes?.items?.length || 0;
        const tCount = tenantRes?.items?.length || 0;
        const bCount = billsRes?.items?.length || 0;
        const total = pCount + tCount + bCount;

        setStats({
          propertyCount: pCount,
          tenantCount: tCount,
          billCount: bCount,
          trends: total > 0 ? [
            { label: "Properties", val: `${Math.round((pCount / total) * 100)}%` },
            { label: "Tenants", val: `${Math.round((tCount / total) * 100)}%` },
            { label: "Bills", val: `${Math.round((bCount / total) * 100)}%` },
          ] : [],
        });
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
  }, []);

  const handleSearch = useCallback(async (forcedQuery?: string) => {
    const queryToSubmit = forcedQuery !== undefined ? forcedQuery : q;
    if (!queryToSubmit) return;

    try {
      setLoading(true);
      const res = await apiFetch<ApiResponse<SearchResultItem>>(
        `/api/atlasbook/search?q=${encodeURIComponent(queryToSubmit)}`
      );
      if (res?.success) {
        setResults(res.results || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [q]);

  const triggerQuickSearch = useCallback((tag: string) => {
    setQ(tag);
    handleSearch(tag);
  }, [handleSearch]);

  const getIcon = (type: string) => {
    switch (type) {
      case "Property":
        return <Building size={16} color={colors.text} />;
      case "Tenant":
        return <Users size={16} color={colors.text} />;
      case "Account":
        return <Wallet size={16} color={colors.text} />;
      case "Transaction":
        return <CreditCard size={16} color={colors.text} />;
      default:
        return <Box size={16} color={colors.text} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        <View style={styles.headerBlock}>
          <View style={styles.badgeContainer}>
            <Sparkles size={14} color={colors.primary} />
            <Text style={styles.badgeText}>AI-POWERED SEARCH & ANALYTICS</Text>
          </View>
          <Text style={styles.moduleTitleHeading}>Atlas Search</Text>
          <Text style={styles.moduleSubtitleText}>
            Search across properties, tenants, accounts, and millions of transactions instantly.
          </Text>
        </View>

        <View style={styles.searchBarWrapperCard}>
          <View style={styles.searchInputFieldContainer}>
            <Search size={20} color={colors.placeholderText} style={styles.searchIconLeft} />
            <TextInput
              style={styles.searchInputFieldText}
              placeholder="Type anything... 'Rent for Unit 101', 'Pending bills'"
              placeholderTextColor={colors.placeholderText}
              value={q}
              onChangeText={setQ}
              onSubmitEditing={() => handleSearch()}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity 
            style={styles.searchSubmitButton} 
            onPress={() => handleSearch()} 
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primaryText} />
            ) : (
              <Text style={styles.searchSubmitButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ marginBottom: 24 }}>
          {results.length > 0 && (
            <Text style={styles.resultsSectionHeaderLabel}>
              Search Results ({results.length})
            </Text>
          )}

          <View style={styles.resultsListStackContainer}>
            {results.map((res, i) => {
              const currentId = res.id || res._id || "";
              const sliceId = currentId.length > 6 ? currentId.slice(-6) : currentId || "000000";
              return (
                <TouchableOpacity key={`${currentId}-${i}`} style={styles.resultRowInteractiveCard} activeOpacity={0.7}>
                  <View style={styles.resultRowLeftFlexAnchor}>
                    <View style={styles.iconBoxSurface}>
                      {getIcon(res.type)}
                    </View>
                    <View style={styles.resultRowMetaMetaColumn}>
                      <View style={styles.resultBadgeAndIdInlineFlex}>
                        <View style={styles.typeBadgeOutline}>
                          <Text style={styles.typeBadgeOutlineText}>{res.type}</Text>
                        </View>
                        <Text style={styles.rowIdentifierText}>
                          ID: {sliceId}
                        </Text>
                      </View>
                      <Text style={styles.resultRowMainTitleLabel} numberOfLines={1}>
                        {res.title}
                      </Text>
                    </View>
                  </View>
                  <ArrowRight size={20} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}

            {q && !loading && results.length === 0 && (
              <View style={styles.emptyStateContainerCenteredDashed}>
                <Text style={styles.emptyStateParagraphFallbackText}>
                  No results found for "{q}". Try searching for something else.
                </Text>
                <View style={styles.emptyStateInlineTagsFlexWrapper}>
                  {["Properties", "Invoices", "Tenants", "Accounts"].map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={styles.emptyStateQuickSearchBadgeButton}
                      onPress={() => triggerQuickSearch(tag)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.emptyStateQuickSearchBadgeButtonText}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.aiAnalyticsDividedGridCanvas}>
          <View style={styles.aiTextAnalysisSummaryColumn}>
            <View style={styles.aiHeaderTitleInlineRow}>
              <Sparkles size={18} color={colors.primary} />
              <Text style={styles.aiHeaderTitleLabelText}>AI Analytics Summary</Text>
            </View>
            <Text style={styles.aiParagraphParagraphDescText}>
              Atlas AI has scanned your active database. You currently have {stats.propertyCount} properties and{" "}
              {stats.tenantCount} tenants registered. There are {stats.billCount} recorded vendor bills. Recommendation: Keep
              an eye on accounts payable to maintain healthy cash flow, and ensure property unit occupancies are maximized.
            </Text>
          </View>

          <View style={styles.trendsDarkDisplayCard}>
            <View style={styles.trendsCardHeaderMetaRow}>
              <Text style={styles.trendsCardHeaderLabelTitleText}>Search Trends</Text>
              <View style={styles.trendsPositiveStatusBadge}>
                <Text style={styles.trendsPositiveStatusBadgeText}>Positive</Text>
              </View>
            </View>
            <View style={styles.trendsMetricStackCanvas}>
              {stats.trends.map((stat, i) => (
                <View key={`${stat.label}-${i}`} style={styles.trendBarUnitItemBlock}>
                  <View style={styles.trendBarTextLabelsIndicatorRow}>
                    <Text style={styles.trendBarLabelNameText}>{stat.label}</Text>
                    <Text style={styles.trendBarPercentageValueText}>{stat.val}</Text>
                  </View>
                  <View style={styles.trendProgressBarBackgroundTrack}>
                    <View 
                      style={[
                        styles.trendProgressBarActiveFill, 
                        { width: (stat.val.endsWith("%") ? stat.val : "0%") as DimensionValue }
                      ]} 
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}