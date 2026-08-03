import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  useWindowDimensions,
  Alert
} from "react-native";
import * as Print from "expo-print";
import { Printer, Globe, FolderPlus, Share2, Mail } from "lucide-react-native";
import { ActiveWebsites } from "@/components/digitalassets/ActiveWebsites";
import { FutureWebsites } from "@/components/digitalassets/FutureWebsites";
import { SocialMediaAccounts } from "@/components/digitalassets/SocialMediaAccounts";
import { EmailAccounts } from "@/components/digitalassets/EmailAccounts";
import { useTheme } from "@/contexts/ThemeContext";

type TabKey = "active-websites" | "future-websites" | "social-media" | "email-accounts";

interface TabConfig {
  id: TabKey;
  label: string;
  cardTitle: string;
  icon: React.ElementType;
}

export default function DigitalAssetsMobile() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isSmallScreen = width < 375;

  const [activeTab, setActiveTab] = useState<TabKey>("active-websites");
  const { uiTheme } = useTheme() as any;

  const isDark =
    uiTheme?.theme === "dark" ||
    uiTheme?.theme === "metallic-elite" ||
    uiTheme?.panelColors?.dashboardTextColor === "#ffffff" ||
    uiTheme?.panelColors?.dashboardTextColor === "#f4f4f5";

  const colors = useMemo(() => {
    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#090a0f" : "#f8fafc"),
      surface: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#0f1117" : "#ffffff"),
      border: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"),
      borderLight: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
      textMuted: isDark ? "#94a3b8" : "#64748b",
      primary: uiTheme?.customColors?.primary || "#0072FF",
      primaryLight: isDark ? "rgba(0, 114, 255, 0.15)" : "#eff6ff",
    };
  }, [uiTheme, isDark]);

  const tabs: TabConfig[] = useMemo(
    () => [
      { id: "active-websites", label: "Active Websites", cardTitle: "Active Websites", icon: Globe },
      { id: "future-websites", label: "Future Websites", cardTitle: "Future Websites", icon: FolderPlus },
      { id: "social-media", label: "Social Media", cardTitle: "Social Media Accounts", icon: Share2 },
      { id: "email-accounts", label: "Email Accounts", cardTitle: "Email Accounts", icon: Mail },
    ],
    []
  );

  const handlePrint = useCallback(async () => {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; }
              h1 { font-size: 26px; font-weight: 700; margin-bottom: 4px; }
              p.sub { color: #64748b; font-size: 14px; margin-bottom: 24px; }
              .section { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
              .section-title { font-size: 16px; font-weight: 700; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
            </style>
          </head>
          <body>
            <h1>Digital Assets</h1>
            <p class="sub">Manage websites, domains, and social media accounts</p>
            <div class="section"><div class="section-title">Active Websites</div></div>
            <div class="section"><div class="section-title">Future Websites</div></div>
            <div class="section"><div class="section-title">Social Media Accounts</div></div>
            <div class="section"><div class="section-title">Email Accounts</div></div>
          </body>
        </html>
      `;
      await Print.printAsync({ html: htmlContent });
    } catch (error: any) {
      Alert.alert("Print Error", error?.message || "Unable to print report.");
    }
  }, []);

  const currentTabConfig = useMemo(() => {
    return tabs.find((t) => t.id === activeTab) || tabs[0];
  }, [tabs, activeTab]);

  const renderTabContent = () => {
    try {
      switch (activeTab) {
        case "active-websites":
          return ActiveWebsites ? <ActiveWebsites /> : null;
        case "future-websites":
          return FutureWebsites ? <FutureWebsites /> : null;
        case "social-media":
          return SocialMediaAccounts ? <SocialMediaAccounts /> : null;
        case "email-accounts":
          return EmailAccounts ? <EmailAccounts /> : null;
        default:
          return null;
      }
    } catch (err: any) {
      return (
        <View style={{ padding: 16, alignItems: "center" }}>
          <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "600" }}>
            Failed to render tab content: {err?.message || "Invalid Component"}
          </Text>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: isTablet ? 24 : 16 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTextGroup}>
            <Text
              style={[
                styles.title,
                { color: colors.text, fontSize: isTablet ? 28 : isSmallScreen ? 20 : 24 }
              ]}
            >
              Digital Assets
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Manage websites, domains, and social media accounts
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.printButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handlePrint}
            activeOpacity={0.7}
          >
            <Printer size={15} color={colors.text} />
            <Text style={[styles.printButtonText, { color: colors.text }]}>Print Report</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.tabBarWrapper, { borderBottomColor: colors.borderLight }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContainer}
          >
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tabTrigger,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    isActive && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primaryLight,
                    },
                  ]}
                  onPress={() => setActiveTab(tab.id)}
                  activeOpacity={0.8}
                >
                  <IconComponent size={14} color={isActive ? colors.primary : colors.textMuted} />
                  <Text
                    style={[
                      styles.tabTriggerText,
                      { color: colors.textMuted },
                      isActive && [styles.tabTriggerTextActive, { color: colors.primary }],
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {currentTabConfig.cardTitle}
            </Text>
          </View>
          <View style={styles.cardBody}>{renderTabContent()}</View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 12,
  },
  headerTextGroup: {
    flex: 1,
  },
  title: {
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  printButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  printButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  tabBarWrapper: {
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  tabScrollContainer: {
    gap: 8,
    paddingBottom: 10,
  },
  tabTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabTriggerText: {
    fontSize: 13,
    fontWeight: "500",
  },
  tabTriggerTextActive: {
    fontWeight: "600",
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardBody: {
    padding: 16,
  },
});