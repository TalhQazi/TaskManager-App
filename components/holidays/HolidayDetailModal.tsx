import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from "react-native";
import { X, Calendar, Globe, Star, Tag, ArrowRight } from "lucide-react-native";
import { useTokens } from "@/contexts/ThemeContext";
import { HolidayItem } from "@/lib/admin/apiClient";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

interface HolidayDetailModalProps {
  visible: boolean;
  holiday: HolidayItem | null;
  onClose: () => void;
}

const EFFECT_DESCRIPTIONS: Record<string, { label: string; icon: string }> = {
  sparkles: { label: "Magical Sparkles & Lights", icon: "✨" },
  lanterns: { label: "Traditional Floating Lanterns", icon: "🏮" },
  confetti: { label: "Celebration Confetti", icon: "🎊" },
  snow: { label: "Winter Snowfall Effect", icon: "❄️" },
  leaves: { label: "Autumn Falling Leaves", icon: "🍂" },
  stars: { label: "Twinkling Starlight", icon: "🌟" },
};

export default function HolidayDetailModal({
  visible,
  holiday,
  onClose,
}: HolidayDetailModalProps) {
  const tokens = useTokens();
  const router = useRouter();

  if (!holiday) return null;

  const colorConfig = holiday.themeConfig?.colorConfig || {
    from: "#1e3a8a",
    via: "#3b82f6",
    to: "#60a5fa",
  };

  const effectMeta = holiday.themeConfig?.effects
    ? EFFECT_DESCRIPTIONS[holiday.themeConfig.effects] || { label: holiday.themeConfig.effects, icon: "✨" }
    : null;

  const handleRequestLeave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    // Route to leave requests screen
    try {
      router.push("/(tabs)/leaverequest" as any);
    } catch {
      // Fallback
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: tokens.cardBackground, borderColor: tokens.cardBorder }]}>
          {/* Header Banner with Holiday Gradient */}
          <LinearGradient
            colors={[colorConfig.from || "#1e3a8a", colorConfig.via || "#3b82f6", colorConfig.to || "#60a5fa"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            <View style={styles.bannerOverlay}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color="#ffffff" />
              </TouchableOpacity>

              <View style={styles.bannerBadgeRow}>
                <View style={styles.bannerStatusPill}>
                  <Text style={styles.bannerStatusText}>
                    {holiday.status === "today"
                      ? "🎉 Happening Today"
                      : holiday.status === "upcoming"
                      ? `⏳ In ${holiday.daysUntil} Days`
                      : "Completed This Year"}
                  </Text>
                </View>

                {effectMeta && (
                  <View style={styles.bannerEffectPill}>
                    <Text style={styles.bannerEffectText}>{effectMeta.icon} {effectMeta.label}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.bannerTitle} numberOfLines={2}>
                {holiday.displayName}
              </Text>
              <Text style={styles.bannerSub}>
                {holiday.region} • {holiday.country_code?.toUpperCase() === "GLOBAL" ? "Global Observance" : holiday.country_code?.toUpperCase()}
              </Text>
            </View>
          </LinearGradient>

          {/* Modal Content Scroll */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Date Details Box */}
            <View style={[styles.detailBox, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <View style={styles.boxRow}>
                <Calendar size={18} color={tokens.primary} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.boxLabel, { color: tokens.textMuted }]}>Observed Date(s)</Text>
                  <Text style={[styles.boxValue, { color: tokens.textPrimary }]}>
                    {holiday.calculatedDates?.startDateStr || holiday.static_start_date}
                    {holiday.calculatedDates?.endDateStr && holiday.calculatedDates.endDateStr !== holiday.calculatedDates.startDateStr
                      ? ` to ${holiday.calculatedDates.endDateStr}`
                      : ""}
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: tokens.border }]} />

              <View style={styles.boxRow}>
                <Globe size={18} color={tokens.primary} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.boxLabel, { color: tokens.textMuted }]}>Calendar Calculation Type</Text>
                  <Text style={[styles.boxValue, { color: tokens.textPrimary }]}>
                    {holiday.is_lunar_calendar
                      ? "Astronomical Lunar Cycle (Shifts Annually)"
                      : "Solar Calendar (Fixed Static Annual Date)"}
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: tokens.border }]} />

              <View style={styles.boxRow}>
                <Tag size={18} color={tokens.primary} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.boxLabel, { color: tokens.textMuted }]}>Classification & Category</Text>
                  <Text style={[styles.boxValue, { color: tokens.textPrimary, textTransform: "capitalize" }]}>
                    {holiday.religion_category} Observance • Level {holiday.significance_level} Significance
                  </Text>
                </View>
              </View>
            </View>

            {/* Significance rating */}
            <View style={styles.significanceSection}>
              <Text style={[styles.significanceTitle, { color: tokens.textSecondary }]}>
                Company Significance Level
              </Text>
              <View style={styles.starsRow}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    color={i < holiday.significance_level ? "#f59e0b" : tokens.border}
                    fill={i < holiday.significance_level ? "#f59e0b" : "transparent"}
                    style={{ marginRight: 4 }}
                  />
                ))}
                <Text style={[styles.starsText, { color: tokens.textMuted }]}>
                  {holiday.significance_level}/5
                </Text>
              </View>
            </View>

            {/* Theme & Styling Details */}
            <View style={[styles.themeBox, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <Text style={[styles.themeBoxTitle, { color: tokens.textPrimary }]}>
                🎨 Holiday Theme Config
              </Text>
              <Text style={[styles.themeBoxDesc, { color: tokens.textMuted }]}>
                When this holiday is active, system headers dynamically blend these celebration colors across the mobile app.
              </Text>

              <View style={styles.swatchRow}>
                <View style={[styles.colorSwatch, { backgroundColor: colorConfig.from || "#3b82f6" }]}>
                  <Text style={styles.swatchHex}>{colorConfig.from}</Text>
                </View>
                <View style={[styles.colorSwatch, { backgroundColor: colorConfig.via || "#60a5fa" }]}>
                  <Text style={styles.swatchHex}>{colorConfig.via}</Text>
                </View>
                <View style={[styles.colorSwatch, { backgroundColor: colorConfig.to || "#93c5fd" }]}>
                  <Text style={styles.swatchHex}>{colorConfig.to}</Text>
                </View>
              </View>
            </View>

            {/* Leave Request Action Card */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleRequestLeave}
              style={[styles.leaveActionCard, { borderColor: tokens.primary, backgroundColor: "rgba(59, 130, 246, 0.08)" }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.leaveActionTitle, { color: tokens.primary }]}>
                  Request Holiday Time Off
                </Text>
                <Text style={[styles.leaveActionDesc, { color: tokens.textSecondary }]}>
                  Submit a leave request or holiday exemption for this date
                </Text>
              </View>
              <ArrowRight size={18} color={tokens.primary} />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "85%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  banner: {
    padding: 18,
    paddingTop: 16,
  },
  bannerOverlay: {
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  bannerBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
    paddingRight: 40,
  },
  bannerStatusPill: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bannerStatusText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  bannerEffectPill: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bannerEffectText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  bannerTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  bannerSub: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 13,
    marginTop: 4,
    fontWeight: "500",
  },
  scrollContent: {
    padding: 16,
  },
  detailBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  boxRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  boxLabel: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  boxValue: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  significanceSection: {
    marginBottom: 16,
  },
  significanceTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  starsText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "600",
  },
  themeBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  themeBoxTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  themeBoxDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  swatchRow: {
    flexDirection: "row",
    gap: 8,
  },
  colorSwatch: {
    flex: 1,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchHex: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowRadius: 3,
  },
  leaveActionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  leaveActionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  leaveActionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});
