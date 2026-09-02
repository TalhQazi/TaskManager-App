import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  Award,
  ShieldCheck,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/services/api";

interface CertificationItem {
  type: string;
  name: string;
  status: "active" | "expiring_soon" | "expired" | "in_progress";
  awardedAt: string;
  expiresAt?: string;
  daysUntilExpiry?: number;
}

interface ProgressionLadderNode {
  level: number;
  label: string;
  title: string;
  requirements: string;
  isCurrent: boolean;
  isUnlocked: boolean;
}

interface CertificationsResponse {
  currentLevel: number;
  currentLevelDefinition: {
    label: string;
    title: string;
    requirements: string;
  };
  nextLevel: number | null;
  nextLevelRequirements: string;
  ladder: ProgressionLadderNode[];
  certifications: CertificationItem[];
}

interface CompanyCertificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CompanyCertificationsModal: React.FC<CompanyCertificationsModalProps> = ({
  visible,
  onClose,
}) => {
  const [data, setData] = useState<CertificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<CertificationsResponse>("/company-reels/certifications");
      setData(res.data);
    } catch (err) {
      console.error("[Certifications] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) fetchCerts();
  }, [visible, fetchCerts]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <Award size={20} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>Certification & Progression</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading || !data ? (
            <ActivityIndicator size="large" color="#F59E0B" style={{ marginVertical: 40 }} />
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Current Rank Banner */}
              <View style={styles.rankBannerCard}>
                <View style={styles.rankBadgeCircle}>
                  <Award size={26} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rankPrefix}>CURRENT WORKFORCE TIER</Text>
                  <Text style={styles.rankTitle}>
                    {data.currentLevelDefinition?.title || "Level 1 — New Hire"}
                  </Text>
                  <Text style={styles.rankSubtitle}>
                    {data.currentLevelDefinition?.requirements}
                  </Text>
                </View>
              </View>

              {/* 4-Level Progression Ladder */}
              <Text style={styles.sectionHeading}>4-Level Progression Ladder</Text>
              <View style={styles.ladderContainer}>
                {(data.ladder || []).map((step) => {
                  const isCurrent = step.isCurrent;
                  const isUnlocked = step.isUnlocked;

                  return (
                    <View
                      key={step.level}
                      style={[
                        styles.ladderStepCard,
                        isCurrent && styles.ladderStepCurrent,
                        !isUnlocked && styles.ladderStepLocked,
                      ]}
                    >
                      <View
                        style={[
                          styles.levelNumberPill,
                          isCurrent && { backgroundColor: "#F59E0B" },
                          isUnlocked && !isCurrent && { backgroundColor: "#22C55E" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.levelNumberText,
                            (isCurrent || isUnlocked) && { color: "#0F172A" },
                          ]}
                        >
                          L{step.level}
                        </Text>
                      </View>

                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.stepTitleText}>{step.title}</Text>
                          {isCurrent && (
                            <View style={styles.currentPill}>
                              <Text style={styles.currentPillText}>ACTIVE</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.stepReqText}>{step.requirements}</Text>
                      </View>

                      {isUnlocked ? (
                        <CheckCircle2 size={18} color="#22C55E" />
                      ) : (
                        <Clock size={16} color="#64748B" />
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Active Certificates List */}
              <Text style={[styles.sectionHeading, { marginTop: 22 }]}>
                Earned Compliance Credentials
              </Text>
              {(data.certifications || []).length === 0 ? (
                <View style={styles.noCertsCard}>
                  <Text style={styles.noCertsText}>
                    Complete your initial onboarding tracks to earn your Level 1 certificate.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {data.certifications.map((cert, index) => {
                    const isExpiring = cert.status === "expiring_soon";
                    const isExpired = cert.status === "expired";

                    let badgeBg = "rgba(34, 197, 94, 0.15)";
                    let badgeColor = "#22C55E";
                    let badgeText = "ACTIVE";

                    if (isExpiring) {
                      badgeBg = "rgba(245, 158, 11, 0.2)";
                      badgeColor = "#F59E0B";
                      badgeText = "RENEWAL SOON";
                    } else if (isExpired) {
                      badgeBg = "rgba(239, 68, 68, 0.2)";
                      badgeColor = "#EF4444";
                      badgeText = "EXPIRED";
                    }

                    return (
                      <View key={index} style={styles.certCard}>
                        <View style={styles.certCardHeader}>
                          <ShieldCheck size={18} color={badgeColor} style={{ marginRight: 6 }} />
                          <Text style={styles.certName}>{cert.name}</Text>
                          <View style={[styles.certStatusPill, { backgroundColor: badgeBg }]}>
                            <Text style={[styles.certStatusText, { color: badgeColor }]}>
                              {badgeText}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.certFooterRow}>
                          <Text style={styles.certDateText}>
                            Issued: {new Date(cert.awardedAt).toLocaleDateString()}
                          </Text>
                          {cert.expiresAt && (
                            <Text style={styles.certDateText}>
                              Expires: {new Date(cert.expiresAt).toLocaleDateString()}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 16,
    maxHeight: "88%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "bold",
  },
  rankBannerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    marginBottom: 18,
  },
  rankBadgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  rankPrefix: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  rankTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginVertical: 2,
  },
  rankSubtitle: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 16,
  },
  sectionHeading: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  ladderContainer: {
    gap: 10,
  },
  ladderStepCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  ladderStepCurrent: {
    borderColor: "#F59E0B",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
  },
  ladderStepLocked: {
    opacity: 0.5,
  },
  levelNumberPill: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  levelNumberText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  stepTitleText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  stepReqText: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  currentPill: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentPillText: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "800",
  },
  noCertsCard: {
    padding: 20,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    alignItems: "center",
  },
  noCertsText: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
  },
  certCard: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  certCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  certName: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  certStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  certStatusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  certFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    paddingTop: 8,
  },
  certDateText: {
    color: "#94A3B8",
    fontSize: 11,
  },
});
