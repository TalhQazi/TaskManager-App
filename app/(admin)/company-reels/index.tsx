import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from "react-native";
import { PlaySquare, Settings2, ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { CompanyReelsFeed } from "@/components/company-reels/CompanyReelsFeed";
import { CompanyReelsAdmin } from "@/components/company-reels/CompanyReelsAdmin";

export default function CompanyReelsAdminScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"admin" | "feed">("admin");

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
              style={[styles.toggleBtn, mode === "admin" && styles.toggleBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMode("admin");
              }}
            >
              <Settings2 size={15} color={mode === "admin" ? "#FFFFFF" : "#94A3B8"} style={{ marginRight: 6 }} />
              <Text style={[styles.toggleBtnText, mode === "admin" && styles.toggleBtnTextActive]}>
                Admin Hub
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, mode === "feed" && styles.toggleBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMode("feed");
              }}
            >
              <PlaySquare size={15} color={mode === "feed" ? "#FFFFFF" : "#94A3B8"} style={{ marginRight: 6 }} />
              <Text style={[styles.toggleBtnText, mode === "feed" && styles.toggleBtnTextActive]}>
                Feed Preview
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Main Content Area */}
      <View style={styles.body}>
        {mode === "admin" ? <CompanyReelsAdmin /> : <CompanyReelsFeed />}
      </View>
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
  body: {
    flex: 1,
  },
});
