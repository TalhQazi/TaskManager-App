import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Platform,
  Image,
  Alert,
} from "react-native";
import { Users, Calendar, CheckCircle, Clock, AlertTriangle } from "lucide-react-native";
import { getTaskContributors, getTaskContributionHistory } from "@/lib/admin/apiClient";

// --- Interfaces ---
interface TaskContributorsProps {
  taskId: string;
}

interface Contributor {
  userId: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  department?: string;
  addedAt: string;
  contributionType: string;
  actions: string[];
  stats?: {
    totalTasksCreated?: number;
    totalTasksUpdated?: number;
    totalTasksCompleted?: number;
  };
}

interface Contribution {
  _id: string;
  contributorId: string;
  contributorName: string;
  action: string;
  description: string;
  createdAt: string;
  impact: string;
}

// --- Helper Utilities ---
const getInitials = (name: string) => {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const getContributionTypeColor = (type: string) => {
  switch (type) {
    case "creator":
      return { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" };
    case "assignee":
      return { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" };
    case "updater":
      return { bg: "#fef9c3", text: "#854d0e", border: "#fef08a" };
    case "reviewer":
      return { bg: "#f3e8ff", text: "#6b21a8", border: "#e9d5ff" };
    default:
      return { bg: "#f4f4f5", text: "#3f3f46", border: "#e4e4e7" };
  }
};

const getImpactColor = (impact: string) => {
  if (impact === "high" || impact === "critical") {
    return { text: "#b91c1c", border: "#fecaca" };
  } else if (impact === "medium") {
    return { text: "#a16207", border: "#fef08a" };
  }
  return { text: "#4b5563", border: "#e5e7eb" };
};

export function TaskContributors({ taskId }: TaskContributorsProps) {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContributors();
  }, [taskId]);

  const loadContributors = async () => {
    setLoading(true);
    try {
      const [contributorsRes, contributionsRes] = await Promise.all([
        getTaskContributors(taskId),
        getTaskContributionHistory(taskId, 10),
      ]);
      setContributors(contributorsRes.items || []);
      setContributions(contributionsRes.items || []);
    } catch (err) {
      console.error("Failed to load contributors:", err);
      Alert.alert("Error", "Failed to load contributors");
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string, size = 12) => {
    switch (action) {
      case "created":
        return <CheckCircle size={size} color="#22c55e" />;
      case "completed":
        return <CheckCircle size={size} color="#3b82f6" />;
      case "updated":
      case "status_changed":
        return <Clock size={size} color="#eab308" />;
      default:
        return <Calendar size={size} color="#a1a1aa" />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // --- Loading Skeleton View Pattern ---
  if (loading) {
    return (
      <View style={[styles.card, styles.shadow]}>
        <View style={styles.cardHeader}>
          <Users size={18} color="#09090b" />
          <Text style={styles.cardTitle}>Worked On By</Text>
        </View>
        <View style={styles.cardContent}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <View style={styles.skeletonAvatar} />
              <View style={styles.skeletonTextContainer}>
                <View style={styles.skeletonLineLong} />
                <View style={styles.skeletonLineShort} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // --- Empty Fallback Layout ---
  if (contributors.length === 0) {
    return (
      <View style={[styles.card, styles.shadow]}>
        <View style={styles.cardHeader}>
          <Users size={18} color="#09090b" />
          <Text style={styles.cardTitle}>Worked On By</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.emptyText}>
            No contributors yet. Contributors will appear here when they interact with this task.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Contributors Base Section */}
      <View style={[styles.card, styles.shadow]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerRow}>
            <Users size={18} color="#09090b" />
            <Text style={styles.cardTitle}>Worked On By</Text>
          </View>
          <Text style={styles.cardDescription}>
            People who have contributed to this task
          </Text>
        </View>

        <View style={styles.cardContent}>
          {contributors.map((contributor) => {
            const config = getContributionTypeColor(contributor.contributionType);
            return (
              <View key={contributor.userId} style={styles.contributorItem}>
                
                {/* Fallback Core Avatar View */}
                <View style={styles.avatarWrapper}>
                  {contributor.avatar ? (
                    <Image source={{ uri: contributor.avatar }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>
                        {getInitials(contributor.name)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Right Metadata Context Column */}
                <View style={styles.metaColumn}>
                  <View style={styles.nameBadgeRow}>
                    <Text style={styles.contributorName} numberOfLines={1}>
                      {contributor.name}
                    </Text>
                    <View style={[styles.typeBadge, { backgroundColor: config.bg, borderColor: config.border }]}>
                      <Text style={[styles.typeBadgeText, { color: config.text }]}>
                        {contributor.contributionType}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.subtext} numberOfLines={1}>{contributor.email}</Text>
                  {contributor.department && (
                    <Text style={styles.subtext} numberOfLines={1}>{contributor.department}</Text>
                  )}

                  {/* Operational Event Actions Wrapper (Web-style Flex wrap matching) */}
                  {contributor.actions && contributor.actions.length > 0 && (
                    <View style={styles.actionsPillContainer}>
                      {contributor.actions.map((action) => (
                        <View key={action} style={styles.actionSecondaryPill}>
                          {getActionIcon(action, 11)}
                          <Text style={styles.actionPillText}>{action}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Timestamp Block */}
                <Text style={styles.dateStamp}>
                  {formatDate(contributor.addedAt)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* History Chronology Section */}
      {contributions.length > 0 && (
        <View style={[styles.card, styles.shadow]}>
          <View style={styles.cardHeader}>
            <Text style={styles.recentActivityTitle}>Recent Activity</Text>
          </View>
          <View style={styles.cardContent}>
            {contributions.slice(0, 5).map((contribution) => {
              const impactStyle = getImpactColor(contribution.impact);
              return (
                <View key={contribution._id} style={styles.activityTimelineItem}>
                  <View style={styles.activityIconSlot}>
                    {getActionIcon(contribution.action, 13)}
                  </View>
                  
                  <View style={styles.activityMainBody}>
                    <Text style={styles.activityDescriptionText}>
                      <Text style={styles.boldText}>{contribution.contributorName}</Text>{" "}
                      {contribution.description}
                    </Text>
                    <Text style={styles.activityDateText}>
                      {formatDate(contribution.createdAt)}
                    </Text>
                  </View>

                  <View style={[styles.impactBadge, { borderColor: impactStyle.border }]}>
                    <Text style={[styles.impactBadgeText, { color: impactStyle.text }]}>
                      {contribution.impact}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

// --- Layout Stylesheet ---
const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    overflow: "hidden",
  },
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f4f5",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#09090b",
  },
  cardDescription: {
    fontSize: 13,
    color: "#71717a",
    marginTop: 4,
  },
  cardContent: {
    padding: 16,
    gap: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#71717a",
    lineHeight: 20,
  },
  contributorItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f4f5",
  },
  avatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#133767",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  metaColumn: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  nameBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  contributorName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#09090b",
    maxWidth: "65%",
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  subtext: {
    fontSize: 12,
    color: "#71717a",
    marginTop: 2,
  },
  actionsPillContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 8,
  },
  actionSecondaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e4e4e766",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionPillText: {
    fontSize: 11,
    color: "#27272a",
  },
  dateStamp: {
    fontSize: 11,
    color: "#71717a",
    width: 75,
    textAlign: "right",
  },
  recentActivityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#09090b",
  },
  activityTimelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  activityIconSlot: {
    marginTop: 3,
  },
  activityMainBody: {
    flex: 1,
  },
  activityDescriptionText: {
    fontSize: 13,
    color: "#09090b",
    lineHeight: 18,
  },
  boldText: {
    fontWeight: "500",
  },
  activityDateText: {
    fontSize: 11,
    color: "#71717a",
    marginTop: 2,
  },
  impactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  impactBadgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  // Skeleton Box Structural Rules
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f4f4f5",
  },
  skeletonTextContainer: {
    flex: 1,
    gap: 6,
  },
  skeletonLineLong: {
    width: "50%",
    height: 14,
    backgroundColor: "#f4f4f5",
    borderRadius: 4,
  },
  skeletonLineShort: {
    width: "30%",
    height: 10,
    backgroundColor: "#f4f4f5",
    borderRadius: 4,
  },
});