import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { X, Save, Star } from "lucide-react-native";
import { useTokens } from "@/contexts/ThemeContext";
import { HolidayItem, HolidayPayload } from "@/lib/admin/apiClient";
import * as Haptics from "expo-haptics";

interface HolidayEditorModalProps {
  visible: boolean;
  holiday: HolidayItem | null; // null for Create, populated for Edit
  onClose: () => void;
  onSave: (payload: HolidayPayload, id?: string) => Promise<void>;
}

const GRADIENT_PRESETS = [
  { name: "Ocean Blue", from: "#0f172a", via: "#1e3a8a", to: "#3b82f6" },
  { name: "Royal Gold", from: "#3F0071", via: "#610094", to: "#FFB319" },
  { name: "Emerald Glow", from: "#064e3b", via: "#047857", to: "#10b981" },
  { name: "Festive Red", from: "#7A0000", via: "#A30000", to: "#D60000" },
  { name: "Autumn Warm", from: "#7c2d12", via: "#c2410c", to: "#f97316" },
  { name: "Winter Frost", from: "#1e293b", via: "#334155", to: "#94a3b8" },
];

const EFFECTS_OPTIONS = [
  { label: "None", value: "" },
  { label: "✨ Sparkles", value: "sparkles" },
  { label: "🏮 Lanterns", value: "lanterns" },
  { label: "🎊 Confetti", value: "confetti" },
  { label: "❄️ Snow", value: "snow" },
  { label: "🍂 Leaves", value: "leaves" },
  { label: "🌟 Stars", value: "stars" },
];

const CATEGORY_OPTIONS: { label: string; value: "national" | "religious" | "cultural" }[] = [
  { label: "National", value: "national" },
  { label: "Religious", value: "religious" },
  { label: "Cultural", value: "cultural" },
];

export default function HolidayEditorModal({
  visible,
  holiday,
  onClose,
  onSave,
}: HolidayEditorModalProps) {
  const tokens = useTokens();

  const [displayName, setDisplayName] = useState("");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("global");
  const [region, setRegion] = useState("Global");
  const [category, setCategory] = useState<"national" | "religious" | "cultural">("national");
  const [isLunar, setIsLunar] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [significance, setSignificance] = useState(3);
  const [effect, setEffect] = useState("");
  const [colorFrom, setColorFrom] = useState("#1e3a8a");
  const [colorVia, setColorVia] = useState("#3b82f6");
  const [colorTo, setColorTo] = useState("#60a5fa");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (holiday) {
      setDisplayName(holiday.displayName || "");
      setName(holiday.name || "");
      setCountryCode(holiday.country_code || "global");
      setRegion(holiday.region || "Global");
      setCategory(holiday.religion_category || "national");
      setIsLunar(Boolean(holiday.is_lunar_calendar));
      setStartDate(holiday.static_start_date || "");
      setEndDate(holiday.static_end_date || "");
      setSignificance(holiday.significance_level || 3);
      setEffect(holiday.themeConfig?.effects || "");
      setColorFrom(holiday.themeConfig?.colorConfig?.from || "#1e3a8a");
      setColorVia(holiday.themeConfig?.colorConfig?.via || "#3b82f6");
      setColorTo(holiday.themeConfig?.colorConfig?.to || "#60a5fa");
      setIsActive(holiday.is_active ?? true);
    } else {
      // Defaults for New
      setDisplayName("");
      setName("");
      setCountryCode("US");
      setRegion("North America");
      setCategory("national");
      setIsLunar(false);
      setStartDate("07-04");
      setEndDate("07-04");
      setSignificance(3);
      setEffect("confetti");
      setColorFrom("#1e3a8a");
      setColorVia("#3b82f6");
      setColorTo("#60a5fa");
      setIsActive(true);
    }
  }, [holiday, visible]);

  const handleDisplayNameChange = (text: string) => {
    setDisplayName(text);
    if (!holiday) {
      // Auto-generate slug for new holidays
      setName(text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
    }
  };

  const handleApplyPreset = (preset: typeof GRADIENT_PRESETS[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setColorFrom(preset.from);
    setColorVia(preset.via);
    setColorTo(preset.to);
  };

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      Alert.alert("Required Field", "Please enter a display name for the holiday.");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Required Field", "Please enter a unique holiday slug/key.");
      return;
    }

    if (!isLunar && (!startDate.trim() || !startDate.includes("-"))) {
      Alert.alert("Invalid Date", "Please enter a valid start date in MM-DD format (e.g. 07-04).");
      return;
    }

    setSaving(true);
    try {
      const payload: HolidayPayload = {
        displayName: displayName.trim(),
        name: name.trim().toLowerCase(),
        country_code: countryCode.trim(),
        region: region.trim(),
        religion_category: category,
        is_lunar_calendar: isLunar,
        static_start_date: isLunar ? "" : startDate.trim(),
        static_end_date: isLunar ? "" : (endDate.trim() || startDate.trim()),
        significance_level: Number(significance),
        themeConfig: {
          backgroundType: "color",
          colorConfig: {
            from: colorFrom.trim(),
            via: colorVia.trim(),
            to: colorTo.trim(),
          },
          effects: effect,
          overlay: {
            enabled: true,
            color: "rgba(0,0,0,0.3)",
          },
        },
        is_active: isActive,
      };

      await onSave(payload, holiday?.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (err: any) {
      Alert.alert("Save Failed", err.message || "Could not save holiday.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: tokens.cardBackground, borderColor: tokens.cardBorder }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: tokens.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: tokens.textPrimary }]}>
                {holiday ? "Edit Holiday" : "Create New Holiday"}
              </Text>
              <Text style={[styles.modalSub, { color: tokens.textMuted }]}>
                Configure dates, regional localization, and visual themes
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={tokens.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Form Scroll Content */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Display Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: tokens.textSecondary }]}>Display Name *</Text>
              <TextInput
                value={displayName}
                onChangeText={handleDisplayNameChange}
                placeholder="e.g. Independence Day"
                placeholderTextColor={tokens.textMuted}
                style={[styles.input, { backgroundColor: tokens.surface, borderColor: tokens.border, color: tokens.textPrimary }]}
              />
            </View>

            {/* Slug / Key */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: tokens.textSecondary }]}>Unique Identifier / Slug *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. independence-day"
                placeholderTextColor={tokens.textMuted}
                autoCapitalize="none"
                editable={!holiday} // keep existing slug fixed
                style={[
                  styles.input,
                  { backgroundColor: tokens.surface, borderColor: tokens.border, color: tokens.textPrimary },
                  holiday ? { opacity: 0.6 } : null,
                ]}
              />
            </View>

            {/* Country Code & Region */}
            <View style={styles.rowTwo}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: tokens.textSecondary }]}>Country Code</Text>
                <TextInput
                  value={countryCode}
                  onChangeText={setCountryCode}
                  placeholder="US, IN, global"
                  placeholderTextColor={tokens.textMuted}
                  autoCapitalize="characters"
                  style={[styles.input, { backgroundColor: tokens.surface, borderColor: tokens.border, color: tokens.textPrimary }]}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: tokens.textSecondary }]}>Region</Text>
                <TextInput
                  value={region}
                  onChangeText={setRegion}
                  placeholder="North America, Asia"
                  placeholderTextColor={tokens.textMuted}
                  style={[styles.input, { backgroundColor: tokens.surface, borderColor: tokens.border, color: tokens.textPrimary }]}
                />
              </View>
            </View>

            {/* Category Selector */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: tokens.textSecondary }]}>Category</Text>
              <View style={styles.chipRow}>
                {CATEGORY_OPTIONS.map((cat) => {
                  const selected = category === cat.value;
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      onPress={() => setCategory(cat.value)}
                      style={[
                        styles.chip,
                        { borderColor: tokens.border, backgroundColor: tokens.surface },
                        selected && { borderColor: tokens.primary, backgroundColor: "rgba(59, 130, 246, 0.15)" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: tokens.textSecondary },
                          selected && { color: tokens.primary, fontWeight: "700" },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Lunar Calendar Switch */}
            <View style={[styles.switchRow, { borderColor: tokens.border }]}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.switchTitle, { color: tokens.textPrimary }]}>
                  Astronomical Lunar Calendar
                </Text>
                <Text style={[styles.switchDesc, { color: tokens.textMuted }]}>
                  Automatically calculated according to moon phases & annual cycle
                </Text>
              </View>
              <Switch
                value={isLunar}
                onValueChange={setIsLunar}
                trackColor={{ false: tokens.border, true: tokens.primary }}
              />
            </View>

            {/* Static Solar Date Range (if not Lunar) */}
            {!isLunar && (
              <View style={styles.rowTwo}>
                <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, { color: tokens.textSecondary }]}>Start Date (MM-DD) *</Text>
                  <TextInput
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="07-04"
                    placeholderTextColor={tokens.textMuted}
                    maxLength={5}
                    style={[styles.input, { backgroundColor: tokens.surface, borderColor: tokens.border, color: tokens.textPrimary }]}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: tokens.textSecondary }]}>End Date (MM-DD)</Text>
                  <TextInput
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="07-04"
                    placeholderTextColor={tokens.textMuted}
                    maxLength={5}
                    style={[styles.input, { backgroundColor: tokens.surface, borderColor: tokens.border, color: tokens.textPrimary }]}
                  />
                </View>
              </View>
            )}

            {/* Significance Level (1 - 5) */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: tokens.textSecondary }]}>
                Company Significance Rating: {significance} / 5
              </Text>
              <View style={styles.starPicker}>
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    onPress={() => setSignificance(lvl)}
                    style={styles.starBtn}
                  >
                    <Star
                      size={24}
                      color={lvl <= significance ? "#f59e0b" : tokens.border}
                      fill={lvl <= significance ? "#f59e0b" : "transparent"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Animated Effect */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: tokens.textSecondary }]}>Visual Celebration Effect</Text>
              <View style={styles.chipRow}>
                {EFFECTS_OPTIONS.map((eff) => {
                  const selected = effect === eff.value;
                  return (
                    <TouchableOpacity
                      key={eff.value}
                      onPress={() => setEffect(eff.value)}
                      style={[
                        styles.chip,
                        { borderColor: tokens.border, backgroundColor: tokens.surface },
                        selected && { borderColor: tokens.primary, backgroundColor: "rgba(59, 130, 246, 0.15)" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: tokens.textSecondary },
                          selected && { color: tokens.primary, fontWeight: "700" },
                        ]}
                      >
                        {eff.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Theme Gradient Presets */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: tokens.textSecondary }]}>Theme Color Gradient</Text>
              <View style={styles.chipRow}>
                {GRADIENT_PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p.name}
                    onPress={() => handleApplyPreset(p)}
                    style={[styles.presetBtn, { backgroundColor: p.from, borderColor: p.to }]}
                  >
                    <Text style={styles.presetText}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Active Status Switch */}
            <View style={[styles.switchRow, { borderColor: tokens.border }]}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.switchTitle, { color: tokens.textPrimary }]}>Active Status</Text>
                <Text style={[styles.switchDesc, { color: tokens.textMuted }]}>
                  When active, this holiday appears in schedules and triggers seasonal themes
                </Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: tokens.border, true: "#10b981" }}
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.modalFooter, { borderTopColor: tokens.border }]}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.cancelBtn, { borderColor: tokens.border }]}
              disabled={saving}
            >
              <Text style={[styles.cancelBtnText, { color: tokens.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.saveBtn, { backgroundColor: tokens.primary }]}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Save size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>
                    {holiday ? "Save Changes" : "Create Holiday"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
    maxWidth: 520,
    maxHeight: "90%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 16,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  rowTwo: {
    flexDirection: "row",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  presetText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 2,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  switchDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  starPicker: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  starBtn: {
    padding: 4,
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
