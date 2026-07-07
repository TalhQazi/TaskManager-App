import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform
} from "react-native";
import * as Print from "expo-print";
import { Printer, Globe, FolderPlus, Share2, Mail } from "lucide-react-native";
import { FutureWebsites } from "@/components/digitalassets/FutureWebsites";
import { SocialMediaAccounts } from "@/components/digitalassets/SocialMediaAccounts";
import { EmailAccounts } from "@/components/digitalassets/EmailAccounts";
import ActiveWebsites from "@/components/digitalassets/ActiveWebsites";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";

type TabKey = "active-websites" | "future-websites" | "social-media" | "email-accounts";

export default function DigitalAssetsMobile() {
  const themeContext = useTheme() as any;
  const [activeTab, setActiveTab] = useState<TabKey>("active-websites");

  const activeColors = useMemo(() => {
    const uiTheme = themeContext?.uiTheme;
    const isDark = uiTheme?.theme === "dark" || uiTheme?.theme === "metallic-elite";

    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#090a0f" : "#f8fafc"),
      surface: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#0f1117" : "#ffffff"),
      border: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"),
      borderLight: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9"),
      surfaceVariant: isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9",
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      textMuted: isDark ? "#94a3b8" : "#64748b",
      textLight: isDark ? "#64748b" : "#94a3b8",
      primary: uiTheme?.customColors?.primary || "#0072FF",
      primaryLight: isDark ? "rgba(0, 114, 255, 0.15)" : "#eff6ff",
    };
  }, [themeContext]);

  const tabsRegistry = [
    { id: "active-websites" as TabKey, label: "Active", icon: Globe },
    { id: "future-websites" as TabKey, label: "Future", icon: FolderPlus },
    { id: "social-media" as TabKey, label: "Socials", icon: Share2 },
    { id: "email-accounts" as TabKey, label: "Emails", icon: Mail },
  ];

  const handleSystemPrint = async () => {
    try {
      const htmlReportMarkup = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; }
              h1 { font-size: 28px; margin-bottom: 4px; font-weight: bold; }
              p.desc { color: #64748b; font-size: 14px; margin-bottom: 24px; }
              .section-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; page-break-inside: avoid; }
              .card-title { font-size: 18px; font-weight: bold; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
            </style>
          </head>
          <body>
            <h1>Digital Assets Report</h1>
            <p class="desc">Comprehensive snapshot log summarizing asset infrastructure nodes.</p>
            
            <div class="section-card">
              <div class="card-title">Active Websites</div>
              <p>Asset list details appended via ActiveWebsites component matrix.</p>
            </div>
            <div class="section-card">
              <div class="card-title">Future Websites</div>
              <p>Asset list details appended via FutureWebsites component matrix.</p>
            </div>
            <div class="section-card">
              <div class="card-title">Social Media Accounts</div>
              <p>Asset list details appended via SocialMediaAccounts component matrix.</p>
            </div>
            <div class="section-card">
              <div class="card-title">Email Accounts</div>
              <p>Asset list details appended via EmailAccounts component matrix.</p>
            </div>
          </body>
        </html>
      `;

      await Print.printAsync({
        html: htmlReportMarkup,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "active-websites":
        return <ActiveWebsites />;
      case "future-websites":
        return <FutureWebsites />;
      case "social-media":
        return <SocialMediaAccounts />;
      case "email-accounts":
        return <EmailAccounts />;
      default:
        return null;
    }
  };

  const getActiveTabTitle = () => {
    return tabsRegistry.find(t => t.id === activeTab)?.label + " Directory";
  };

  return (
    <SafeAreaView style={[s(styles.safeContainer), { backgroundColor: activeColors.background }]}>
      <ScrollView contentContainerStyle={s(styles.scrollContainer)} showsVerticalScrollIndicator={false}>
        
        <View style={s(styles.headerBlock)}>
          <View style={s(styles.titleWrapper)}>
            <Text style={[s(styles.headerTitle), { color: activeColors.text }]}>Digital Assets</Text>
            <Text style={[s(styles.headerSubtitle), { color: activeColors.textMuted }]}>
              Manage corporate websites, domain extensions, and digital accounts.
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[s(styles.printActionBtn), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]} 
            onPress={handleSystemPrint} 
            activeOpacity={0.7}
          >
            <Printer size={15} color={activeColors.text} />
            <Text style={[s(styles.printActionBtnText), { color: activeColors.text }]}>Print</Text>
          </TouchableOpacity>
        </View>

        <View style={[s(styles.tabBarRowWrapper), { borderBottomColor: activeColors.borderLight }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(styles.tabScrollInsideFlex)}>
            {tabsRegistry.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    s(styles.tabTriggerItem), 
                    { backgroundColor: activeColors.surface, borderColor: activeColors.border },
                    isActive && [s(styles.tabTriggerItemActive), { borderColor: activeColors.primary, backgroundColor: activeColors.primaryLight }]
                  ]}
                  onPress={() => setActiveTab(tab.id)}
                  activeOpacity={0.8}
                >
                  <TabIcon size={14} color={isActive ? activeColors.primary : activeColors.textMuted} />
                  <Text style={[s(styles.tabTriggerText), { color: activeColors.textMuted }, isActive && [s(styles.tabTriggerTextActive), { color: activeColors.primary }]]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={[s(styles.contentDisplayCard), { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
          <View style={[s(styles.cardHeaderFlex), { borderBottomColor: activeColors.borderLight }]}>
            <Text style={[s(styles.cardTitleText), { color: activeColors.text }]}>{getActiveTabTitle()}</Text>
          </View>
          <View style={s(styles.cardContentBodyContainer)}>
            {renderTabContent()}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { 
    flex: 1 
  },
  scrollContainer: { 
    paddingBottom: 32 
  },
  headerBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 20,
    marginBottom: 16,
    gap: 12
  },
  titleWrapper: { 
    flex: 1 
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: "bold", 
    letterSpacing: -0.5 
  },
  headerSubtitle: { 
    fontSize: 13, 
    marginTop: 4, 
    lineHeight: 18 
  },
  printActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
      android: { elevation: 1 }
    })
  },
  printActionBtnText: { 
    fontSize: 13, 
    fontWeight: "600" 
  },
  tabBarRowWrapper: { 
    marginBottom: 16, 
    borderBottomWidth: 1 
  },
  tabScrollInsideFlex: { 
    paddingHorizontal: 16, 
    gap: 8, 
    paddingBottom: 10 
  },
  tabTriggerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1
  },
  tabTriggerItemActive: {},
  tabTriggerText: { 
    fontSize: 13, 
    fontWeight: "500" 
  },
  tabTriggerTextActive: { 
    fontWeight: "600" 
  },
  contentDisplayCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 }
    })
  },
  cardHeaderFlex: { 
    padding: 16, 
    borderBottomWidth: 1 
  },
  cardTitleText: { 
    fontSize: 15, 
    fontWeight: "600" 
  },
  cardContentBodyContainer: { 
    padding: 16 
  }
});