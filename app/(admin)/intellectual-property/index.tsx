import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { 
  AlertCircle, 
  FileText, 
  Globe, 
  ShieldCheck 
} from "lucide-react-native";
import { FiledPatents } from "./component/FiledPatents";
import { PendingPatents } from "./component/PendingPatents";
import { ExpirationWatch } from "./component/ExpirationWatch";
import { FiledTrademarks } from "./component/FiledTrademarks";
import { GrantedTrademarks } from "./component/GrantedTrademarks";
import { ExpiredPatents } from "./component/ExpiredPatents";
import { useTheme } from "@/contexts/ThemeContext";

export default function IntellectualProperty() {
  const { uiTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<string>("filed-patents");

  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";

  const colors = useMemo(() => ({
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
    cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
    mutedText: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    tabTrack: isDark ? "#1e293b" : "#f3f4f6",
    alertBg: isDark ? "rgba(245, 158, 11, 0.12)" : "#fef3c7",
    alertBorder: isDark ? "rgba(245, 158, 11, 0.25)" : "#fde68a",
    alertTitle: isDark ? "#fbbf24" : "#92400e",
    alertText: isDark ? "#f59e0b" : "#b45309",
    primary: uiTheme.customColors?.primary || "#4f46e5",
    destructive: "#ef4444",
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const tabs = [
    { id: "filed-patents", label: "Filed Patents" },
    { id: "pending-patents", label: "Pending Patents" },
    { id: "expired-patents", label: "Expired Patents" },
    { id: "filed-trademarks", label: "Filed Trademarks" },
    { id: "granted-trademarks", label: "Granted Trademarks" },
    { id: "expiration-watch", label: "Expiration Watch" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContext} showsVerticalScrollIndicator={false}>
      <View style={styles.headerArea}>
        <Text style={styles.titleText}>Intellectual Property</Text>
        <Text style={styles.subTitleText}>
          Manage and track patents and trademarks, including filing dates, registration status, and expiration alerts.
        </Text>
      </View>

      <View style={styles.alertBanner}>
        <AlertCircle size={20} color={colors.alertText} style={styles.alertIcon} />
        <View style={styles.alertMessageContent}>
          <Text style={styles.alertTitle}>Expiration Monitoring Active</Text>
          <Text style={styles.alertDescription}>
            Patents expiring within 60 days will be flagged. Alerts are sent 180, 120, 90, 60, and 30 days before expiration.
          </Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollPadding}
        >
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabTrigger, isSelected ? styles.tabTriggerActive : null]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.tabTriggerText, isSelected ? styles.tabTriggerTextActive : null]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.contentArea}>
        {activeTab === "filed-patents" && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <FileText size={18} color={colors.text} />
              <Text style={styles.cardTitle}>Filed Patents</Text>
            </View>
            <View style={styles.cardContent}>
              <FiledPatents />
            </View>
          </View>
        )}

        {activeTab === "pending-patents" && (
          <PendingPatents />
        )}

        {activeTab === "expired-patents" && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <AlertCircle size={18} color={colors.destructive} />
              <Text style={[styles.cardTitle, { color: colors.destructive }]}>Expired Patents</Text>
            </View>
            <View style={styles.cardContent}>
              <ExpiredPatents />
            </View>
          </View>
        )}

        {activeTab === "filed-trademarks" && (
          <View style={styles.card}>
           
            <View style={styles.cardContent}>
              <FiledTrademarks />
            </View>
          </View>
        )}

        {activeTab === "granted-trademarks" && (
          <View style={styles.card}>
            
            <View style={styles.cardContent}>
              <GrantedTrademarks />
            </View>
          </View>
        )}

        {activeTab === "expiration-watch" && (
          <ExpirationWatch />
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContext: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    headerArea: {
      marginVertical: 18,
    },
    titleText: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.5,
    },
    subTitleText: {
      fontSize: 13,
      color: colors.mutedText,
      marginTop: 4,
      lineHeight: 18,
    },
    alertBanner: {
      flexDirection: "row",
      backgroundColor: colors.alertBg,
      borderWidth: 1,
      borderColor: colors.alertBorder,
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    alertIcon: {
      marginTop: 2,
      marginRight: 10,
    },
    alertMessageContent: {
      flex: 1,
    },
    alertTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.alertTitle,
    },
    alertDescription: {
      fontSize: 12,
      color: colors.alertText,
      marginTop: 2,
      lineHeight: 16,
    },
    tabContainer: {
      backgroundColor: colors.tabTrack,
      borderRadius: 8,
      padding: 4,
      marginBottom: 16,
    },
    tabScrollPadding: {
      gap: 6,
      paddingRight: 12,
    },
    tabTrigger: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 6,
    },
    tabTriggerActive: {
      backgroundColor: colors.primary,
    },
    tabTriggerText: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.mutedText,
    },
    tabTriggerTextActive: {
      color: "#ffffff",
      fontWeight: "600",
    },
    contentArea: {
      width: "100%",
    },
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
      overflow: "hidden",
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 8,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    cardContent: {
      paddingHorizontal: 14,
      paddingBottom: 14,
      paddingTop: 4,
    },
  });
}