import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Calendar, Globe, Star, Edit3, Trash2 } from "lucide-react-native";
import { useTokens } from "@/contexts/ThemeContext";
import { HolidayItem } from "@/lib/admin/apiClient";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

interface HolidayCardProps {
  holiday: HolidayItem;
  onPress: (holiday: HolidayItem) => void;
  onEdit?: (holiday: HolidayItem) => void;
  onDelete?: (holiday: HolidayItem) => void;
  isAdmin?: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  national: { bg: "rgba(59, 130, 246, 0.15)", text: "#60a5fa", label: "National" },
  religious: { bg: "rgba(168, 85, 247, 0.15)", text: "#c084fc", label: "Religious" },
  cultural: { bg: "rgba(16, 185, 129, 0.15)", text: "#34d399", label: "Cultural" },
};

const EFFECT_EMOJIS: Record<string, string> = {
  sparkles: "✨",
  lanterns: "🏮",
  confetti: "🎊",
  snow: "❄️",
  leaves: "🍂",
  stars: "🌟",
};

export default function HolidayCard({
  holiday,
  onPress,
  onEdit,
  onDelete,
  isAdmin = false,
}: HolidayCardProps) {
  const tokens = useTokens();

  const catStyle = CATEGORY_COLORS[holiday.religion_category] || CATEGORY_COLORS.national;
  const effectEmoji = holiday.themeConfig?.effects ? EFFECT_EMOJIS[holiday.themeConfig.effects] || "✨" : null;

  const colorConfig = holiday.themeConfig?.colorConfig || {
    from: "#1e3a8a",
    via: "#3b82f6",
    to: "#60a5fa",
  };

  const getStatusBadge = () => {
    if (holiday.status === "today") {
      return (
        <View style={[styles.statusBadge, { backgroundColor: "rgba(239, 68, 68, 0.2)", borderColor: "#ef4444" }]}>
          <Text style={[styles.statusText, { color: "#ef4444", fontWeight: "700" }]}>🎉 TODAY</Text>
        </View>
      );
    }
    if (holiday.status === "upcoming") {
      const daysText = holiday.daysUntil === 1 ? "Tomorrow" : `In ${holiday.daysUntil} days`;
      return (
        <View style={[styles.statusBadge, { backgroundColor: "rgba(16, 185, 129, 0.15)", borderColor: "rgba(16, 185, 129, 0.3)" }]}>
          <Text style={[styles.statusText, { color: "#10b981" }]}>⏳ {daysText}</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusBadge, { backgroundColor: "rgba(148, 163, 184, 0.1)", borderColor: "rgba(148, 163, 184, 0.2)" }]}>
        <Text style={[styles.statusText, { color: tokens.textMuted }]}>Passed</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(holiday);
      }}
      style={[
        styles.card,
        {
          backgroundColor: tokens.cardBackground,
          borderColor: holiday.status === "today" ? "#ef4444" : tokens.cardBorder,
        },
      ]}
    >
      {/* Top Accent Gradient Line */}
      <LinearGradient
        colors={[colorConfig.from || "#3b82f6", colorConfig.via || "#60a5fa", colorConfig.to || "#93c5fd"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientBar}
      />

      <View style={styles.cardContent}>
        {/* Row 1: Badges (Status, Category, Country) */}
        <View style={styles.topRow}>
          <View style={styles.tagsContainer}>
            {getStatusBadge()}

            <View style={[styles.catBadge, { backgroundColor: catStyle.bg }]}>
              <Text style={[styles.catText, { color: catStyle.text }]}>{catStyle.label}</Text>
            </View>

            <View style={[styles.countryBadge, { borderColor: tokens.border }]}>
              <Globe size={11} color={tokens.textMuted} style={{ marginRight: 3 }} />
              <Text style={[styles.countryText, { color: tokens.textSecondary }]}>
                {holiday.country_code?.toUpperCase() === "GLOBAL" ? "Global" : holiday.country_code?.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Theme preview or effect */}
          {effectEmoji && (
            <View style={styles.effectPill}>
              <Text style={styles.effectText}>{effectEmoji}</Text>
            </View>
          )}
        </View>

        {/* Row 2: Title & Details */}
        <View style={styles.titleSection}>
          <Text style={[styles.holidayTitle, { color: tokens.textPrimary }]} numberOfLines={1}>
            {holiday.displayName}
          </Text>

          {holiday.name !== holiday.displayName && (
            <Text style={[styles.holidaySubtitle, { color: tokens.textMuted }]}>
              {holiday.name} • {holiday.region}
            </Text>
          )}
        </View>

        {/* Row 3: Date & Significance */}
        <View style={styles.bottomRow}>
          <View style={styles.dateContainer}>
            <Calendar size={14} color={tokens.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.dateText, { color: tokens.textPrimary }]}>
              {holiday.calculatedDates?.startDateStr || holiday.static_start_date}
              {holiday.calculatedDates?.endDateStr && holiday.calculatedDates.endDateStr !== holiday.calculatedDates.startDateStr
                ? ` – ${holiday.calculatedDates.endDateStr}`
                : ""}
            </Text>
            {holiday.is_lunar_calendar && (
              <Text style={[styles.lunarIndicator, { color: tokens.textMuted }]}> (Lunar)</Text>
            )}
          </View>

          {/* Significance Stars */}
          <View style={styles.starsContainer}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <Star
                key={idx}
                size={11}
                color={idx < holiday.significance_level ? "#f59e0b" : tokens.border}
                fill={idx < holiday.significance_level ? "#f59e0b" : "transparent"}
                style={{ marginLeft: 1 }}
              />
            ))}
          </View>
        </View>

        {/* Admin Action Bar */}
        {isAdmin && (
          <View style={[styles.adminBar, { borderTopColor: tokens.border }]}>
            <View style={styles.statusIndicator}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: holiday.is_active ? "#10b981" : "#94a3b8" },
                ]}
              />
              <Text style={[styles.statusLabel, { color: tokens.textMuted }]}>
                {holiday.is_active ? "Active" : "Disabled"}
              </Text>
            </View>

            <View style={styles.adminActions}>
              {onEdit && (
                <TouchableOpacity
                  style={[styles.adminBtn, { backgroundColor: "rgba(59, 130, 246, 0.1)" }]}
                  onPress={() => onEdit(holiday)}
                >
                  <Edit3 size={13} color="#3b82f6" />
                  <Text style={[styles.adminBtnText, { color: "#3b82f6" }]}>Edit</Text>
                </TouchableOpacity>
              )}

              {onDelete && (
                <TouchableOpacity
                  style={[styles.adminBtn, { backgroundColor: "rgba(239, 68, 68, 0.1)", marginLeft: 8 }]}
                  onPress={() => onDelete(holiday)}
                >
                  <Trash2 size={13} color="#ef4444" />
                  <Text style={[styles.adminBtnText, { color: "#ef4444" }]}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  gradientBar: {
    height: 4,
    width: "100%",
  },
  cardContent: {
    padding: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  catBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catText: {
    fontSize: 11,
    fontWeight: "600",
  },
  countryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  countryText: {
    fontSize: 11,
    fontWeight: "500",
  },
  effectPill: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  effectText: {
    fontSize: 14,
  },
  titleSection: {
    marginBottom: 10,
  },
  holidayTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  holidaySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 13,
    fontWeight: "600",
  },
  lunarIndicator: {
    fontSize: 11,
    fontStyle: "italic",
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  adminBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  adminActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  adminBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
