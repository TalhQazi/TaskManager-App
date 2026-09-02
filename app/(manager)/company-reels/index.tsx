import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from "react-native";
import { PlaySquare, BarChart3, ArrowLeft, Radio, ShieldCheck } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { CompanyReelsFeed } from "@/components/company-reels/CompanyReelsFeed";
import { CompanyReelsAdmin } from "@/components/company-reels/CompanyReelsAdmin";
import { CompanyBroadcastCreatorModal } from "@/components/company-reels/CompanyBroadcastCreatorModal";
import { CompanyAuditReportModal } from "@/components/company-reels/CompanyAuditReportModal";

export default function CompanyReelsManagerScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"feed" | "analytics">("feed");
  const [broadcastModalVisible, setBroadcastModalVisible] = useState(false);
  const [auditModalVisible, setAuditModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Header Mode Switcher */}
      <SafeAreaView style={styles.topBar}>
        <View style={styles.topBarInner}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={20} color="#F8FAFC" />
          </TouchableOpacity>

          <View style={styles.segmentedToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === "feed" && styles.toggleBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMode("feed");
              }}
            >
              <PlaySquare size={15} color={mode === "feed" ? "#FFFFFF" : "#94A3B8"} style={{ marginRight: 6 }} />
              <Text style={[styles.toggleBtnText, mode === "feed" && styles.toggleBtnTextActive]}>
                Feed
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, mode === "analytics" && styles.toggleBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMode("analytics");
              }}
            >
              <BarChart3 size={15} color={mode === "analytics" ? "#FFFFFF" : "#94A3B8"} style={{ marginRight: 6 }} />
              <Text style={[styles.toggleBtnText, mode === "analytics" && styles.toggleBtnTextActive]}>
                Compliance
              </Text>
            </TouchableOpacity>
          </View>

          {/* Broadcast Alert Composer */}
          <TouchableOpacity
            style={styles.broadcastBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setBroadcastModalVisible(true);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Radio size={14} color="#EF4444" style={{ marginRight: 4 }} />
            <Text style={styles.broadcastBtnText}>Broadcast</Text>
          </TouchableOpacity>

          {/* Compliance Audit Report */}
          <TouchableOpacity
            style={styles.auditBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setAuditModalVisible(true);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ShieldCheck size={14} color="#22C55E" style={{ marginRight: 4 }} />
            <Text style={styles.auditBtnText}>Audit</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Main Content Area */}
      <View style={styles.body}>
        {mode === "feed" ? <CompanyReelsFeed /> : <CompanyReelsAdmin />}
      </View>

      <CompanyBroadcastCreatorModal
        visible={broadcastModalVisible}
        onClose={() => setBroadcastModalVisible(false)}
      />

      <CompanyAuditReportModal
        visible={auditModalVisible}
        onClose={() => setAuditModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0F19",
  },
  topBar: {
    backgroundColor: "#111827",
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
    zIndex: 20,
  },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  segmentedToggle: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: "#0284C7",
  },
  toggleBtnText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  toggleBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  broadcastBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.35)",
  },
  broadcastBtnText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "800",
  },
  auditBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.35)",
  },
  auditBtnText: {
    color: "#22C55E",
    fontSize: 12,
    fontWeight: "800",
  },
  body: {
    flex: 1,
  },
});
