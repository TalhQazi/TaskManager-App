import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import {
  Film,
  Plus,
  BarChart3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  HelpCircle,
  Eye,
  MapPin,
  ShieldCheck,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/services/api";
import { CompanyAuditReportModal } from "./CompanyAuditReportModal";

const CATEGORIES = ["training", "safety", "operations", "culture", "leadership", "compliance"];

export const CompanyReelsAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"library" | "builder" | "analytics" | "paths">("library");
  const [auditModalVisible, setAuditModalVisible] = useState(false);

  // Library State
  const [reels, setReels] = useState<any[]>([]);
  const [loadingReels, setLoadingReels] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("");

  // Training Paths State
  const [paths, setPaths] = useState<any[]>([]);
  const [loadingPaths, setLoadingPaths] = useState(false);

  // Builder State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [category, setCategory] = useState("training");
  const [duration, setDuration] = useState("20");
  const [isMandatory, setIsMandatory] = useState(false);
  const [priority, setPriority] = useState("medium");
  const [savingReel, setSavingReel] = useState(false);

  // Micro-Quiz builder inside builder
  const [hasQuiz, setHasQuiz] = useState(true);
  const [quizQuestion, setQuizQuestion] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [optC, setOptC] = useState("");
  const [correctOpt, setCorrectOpt] = useState<"opt_1" | "opt_2" | "opt_3">("opt_1");
  const [explanation, setExplanation] = useState("");

  // Analytics State
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const fetchReels = useCallback(async () => {
    setLoadingReels(true);
    try {
      const url = filterCategory
        ? `/company-reels/admin/reels?category=${filterCategory}`
        : "/company-reels/admin/reels";
      const res = await apiRequest<any[]>(url);
      setReels(res.data || []);
    } catch (err) {
      console.error("[Admin Reels] Fetch error:", err);
    } finally {
      setLoadingReels(false);
    }
  }, [filterCategory]);

  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const res = await apiRequest<any>("/company-reels/admin/analytics");
      setAnalytics(res.data);
    } catch (err) {
      console.error("[Admin Analytics] Fetch error:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  const fetchPaths = useCallback(async () => {
    setLoadingPaths(true);
    try {
      const res = await apiRequest<any[]>("/company-reels/training-paths");
      setPaths(res.data || []);
    } catch (err) {
      console.error("[Admin Paths] Fetch error:", err);
    } finally {
      setLoadingPaths(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "library") fetchReels();
    if (activeTab === "analytics") fetchAnalytics();
    if (activeTab === "paths") fetchPaths();
  }, [activeTab, fetchReels, fetchAnalytics, fetchPaths]);

  const handleCreateReel = async () => {
    if (!title.trim() || !mediaUrl.trim()) {
      Alert.alert("Missing Fields", "Title and Media URL are required.");
      return;
    }

    setSavingReel(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      let quizId = null;
      if (hasQuiz && quizQuestion.trim() && optA.trim() && optB.trim()) {
        const quizRes = await apiRequest<any>("/company-reels/admin/quizzes", {
          method: "POST",
          body: JSON.stringify({
            topic: category,
            question: quizQuestion,
            answerOptions: [
              { id: "opt_1", text: optA },
              { id: "opt_2", text: optB },
              ...(optC ? [{ id: "opt_3", text: optC }] : []),
            ],
            correctAnswerId: correctOpt,
            explanation,
            difficulty: "medium",
          }),
        });
        quizId = quizRes.data?._id;
      }

      await apiRequest("/company-reels/admin/reels", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          mediaUrl,
          thumbnailUrl,
          category,
          duration: parseInt(duration, 10) || 20,
          isMandatory,
          priority,
          quizId,
          status: "published",
        }),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Company Reel™ published successfully!");

      // Reset form
      setTitle("");
      setDescription("");
      setMediaUrl("");
      setThumbnailUrl("");
      setQuizQuestion("");
      setOptA("");
      setOptB("");
      setOptC("");
      setExplanation("");
      setActiveTab("library");
      fetchReels();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to publish reel.");
    } finally {
      setSavingReel(false);
    }
  };

  const handleDeleteReel = (id: string, reelTitle: string) => {
    Alert.alert("Archive Reel", `Archive "${reelTitle}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Archive",
        style: "destructive",
        onPress: async () => {
          try {
            await apiRequest(`/company-reels/admin/reels/${id}`, { method: "DELETE" });
            fetchReels();
          } catch (err) {
            console.error("Delete failed:", err);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Admin Tabs */}
      <View style={styles.topTabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "library" && styles.tabActive]}
          onPress={() => setActiveTab("library")}
        >
          <Film size={16} color={activeTab === "library" ? "#38BDF8" : "#94A3B8"} />
          <Text style={[styles.tabText, activeTab === "library" && styles.tabTextActive]}>
            Library
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "builder" && styles.tabActive]}
          onPress={() => setActiveTab("builder")}
        >
          <Plus size={16} color={activeTab === "builder" ? "#38BDF8" : "#94A3B8"} />
          <Text style={[styles.tabText, activeTab === "builder" && styles.tabTextActive]}>
            Create Reel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "analytics" && styles.tabActive]}
          onPress={() => setActiveTab("analytics")}
        >
          <BarChart3 size={16} color={activeTab === "analytics" ? "#38BDF8" : "#94A3B8"} />
          <Text style={[styles.tabText, activeTab === "analytics" && styles.tabTextActive]}>
            Analytics & Risk
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "paths" && styles.tabActive]}
          onPress={() => setActiveTab("paths")}
        >
          <MapPin size={16} color={activeTab === "paths" ? "#38BDF8" : "#94A3B8"} />
          <Text style={[styles.tabText, activeTab === "paths" && styles.tabTextActive]}>
            Tracks
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab: Content Library */}
      {activeTab === "library" && (
        <ScrollView style={styles.contentArea}>
          {/* Category Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterPill, !filterCategory && styles.filterPillActive]}
              onPress={() => setFilterCategory("")}
            >
              <Text style={[styles.filterPillText, !filterCategory && styles.filterPillTextActive]}>
                All Categories
              </Text>
            </TouchableOpacity>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterPill, filterCategory === cat && styles.filterPillActive]}
                onPress={() => setFilterCategory(cat)}
              >
                <Text style={[styles.filterPillText, filterCategory === cat && styles.filterPillTextActive]}>
                  {cat.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loadingReels ? (
            <ActivityIndicator size="large" color="#38BDF8" style={{ marginTop: 40 }} />
          ) : reels.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No reels found. Create your first reel!</Text>
            </View>
          ) : (
            <View style={styles.reelsGrid}>
              {reels.map((item) => (
                <View key={item._id} style={styles.reelAdminCard}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.badgeRow}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{item.category?.toUpperCase()}</Text>
                      </View>
                      {item.isMandatory && (
                        <View style={styles.mandatoryBadge}>
                          <Text style={styles.mandatoryBadgeText}>MANDATORY</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteReel(item._id, item.title)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.reelTitleText}>{item.title}</Text>
                  {item.description ? (
                    <Text style={styles.reelDescText} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <View style={styles.statItem}>
                      <Clock size={13} color="#94A3B8" />
                      <Text style={styles.statText}>{item.duration || 20}s</Text>
                    </View>
                    {item.quizId && (
                      <View style={styles.statItem}>
                        <HelpCircle size={13} color="#F59E0B" />
                        <Text style={[styles.statText, { color: "#F59E0B" }]}>Quiz Attached</Text>
                      </View>
                    )}
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{item.status || "published"}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Tab: Reel Builder */}
      {activeTab === "builder" && (
        <ScrollView style={styles.contentArea} contentContainerStyle={{ paddingBottom: 60 }}>
          <Text style={styles.sectionHeader}>Reel Specifications</Text>

          <Text style={styles.inputLabel}>Title *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Workplace Safety & PPE Standards"
            placeholderTextColor="#64748B"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.textInput, { height: 70, textAlignVertical: "top" }]}
            placeholder="Short explanation of the training standard..."
            placeholderTextColor="#64748B"
            multiline
            value={description}
            onChangeText={setDescription}
          />

          <Text style={styles.inputLabel}>Media URL (MP4 / WebM / CDN) *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="https://.../video.mp4"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
            value={mediaUrl}
            onChangeText={setMediaUrl}
          />

          <Text style={styles.inputLabel}>Thumbnail URL (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="https://.../cover.jpg"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
            value={thumbnailUrl}
            onChangeText={setThumbnailUrl}
          />

          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryPickerWrap}>
                {CATEGORIES.slice(0, 4).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.miniCatBtn, category === c && styles.miniCatBtnActive]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={[styles.miniCatText, category === c && styles.miniCatTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ width: 100 }}>
              <Text style={styles.inputLabel}>Duration (s)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={duration}
                onChangeText={setDuration}
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchTitle}>Mandatory Training</Text>
              <Text style={styles.switchDesc}>Required for role compliance</Text>
            </View>
            <Switch
              value={isMandatory}
              onValueChange={setIsMandatory}
              trackColor={{ false: "#334155", true: "#DC2626" }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Micro-Quiz Attachment Section */}
          <View style={styles.quizSectionBox}>
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchTitle}>Attach Micro-Quiz</Text>
                <Text style={styles.switchDesc}>Confirms employee retention</Text>
              </View>
              <Switch
                value={hasQuiz}
                onValueChange={setHasQuiz}
                trackColor={{ false: "#334155", true: "#0284C7" }}
                thumbColor="#FFFFFF"
              />
            </View>

            {hasQuiz && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Question Prompt</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Which PPE items are required before starting?"
                  placeholderTextColor="#64748B"
                  value={quizQuestion}
                  onChangeText={setQuizQuestion}
                />

                <Text style={styles.inputLabel}>Option A {correctOpt === "opt_1" ? "⭐ Correct" : ""}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Option A text..."
                  placeholderTextColor="#64748B"
                  value={optA}
                  onChangeText={setOptA}
                />

                <Text style={styles.inputLabel}>Option B {correctOpt === "opt_2" ? "⭐ Correct" : ""}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Option B text..."
                  placeholderTextColor="#64748B"
                  value={optB}
                  onChangeText={setOptB}
                />

                <Text style={styles.inputLabel}>Option C (Optional) {correctOpt === "opt_3" ? "⭐ Correct" : ""}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Option C text..."
                  placeholderTextColor="#64748B"
                  value={optC}
                  onChangeText={setOptC}
                />

                <Text style={styles.inputLabel}>Correct Answer</Text>
                <View style={styles.correctSelectRow}>
                  <TouchableOpacity
                    style={[styles.selectBtn, correctOpt === "opt_1" && styles.selectBtnActive]}
                    onPress={() => setCorrectOpt("opt_1")}
                  >
                    <Text style={styles.selectBtnText}>A</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.selectBtn, correctOpt === "opt_2" && styles.selectBtnActive]}
                    onPress={() => setCorrectOpt("opt_2")}
                  >
                    <Text style={styles.selectBtnText}>B</Text>
                  </TouchableOpacity>
                  {optC ? (
                    <TouchableOpacity
                      style={[styles.selectBtn, correctOpt === "opt_3" && styles.selectBtnActive]}
                      onPress={() => setCorrectOpt("opt_3")}
                    >
                      <Text style={styles.selectBtnText}>C</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Text style={styles.inputLabel}>Explanation (Shown after answering)</Text>
                <TextInput
                  style={[styles.textInput, { height: 60 }]}
                  placeholder="Explain why this policy or step is required..."
                  placeholderTextColor="#64748B"
                  multiline
                  value={explanation}
                  onChangeText={setExplanation}
                />
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.publishButton}
            onPress={handleCreateReel}
            disabled={savingReel}
            activeOpacity={0.85}
          >
            {savingReel ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Plus size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.publishButtonText}>Publish Company Reel™</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Tab: Analytics & Risk */}
      {activeTab === "analytics" && (
        <ScrollView style={styles.contentArea}>
          {loadingAnalytics ? (
            <ActivityIndicator size="large" color="#38BDF8" style={{ marginTop: 40 }} />
          ) : !analytics ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No analytics telemetry recorded yet.</Text>
            </View>
          ) : (
            <View style={{ gap: 16, paddingBottom: 40 }}>
              {/* KPI Cards Grid */}
              <View style={styles.kpiGrid}>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiVal}>{analytics.overview?.totalReels || 0}</Text>
                  <Text style={styles.kpiLabel}>TOTAL REELS</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={[styles.kpiVal, { color: "#EF4444" }]}>
                    {analytics.overview?.mandatoryReels || 0}
                  </Text>
                  <Text style={styles.kpiLabel}>MANDATORY</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={[styles.kpiVal, { color: "#22C55E" }]}>
                    {analytics.overview?.averageQuizAccuracy || 100}%
                  </Text>
                  <Text style={styles.kpiLabel}>QUIZ ACCURACY</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={[styles.kpiVal, { color: "#38BDF8" }]}>
                    {analytics.overview?.totalCompletionsRecorded || 0}
                  </Text>
                  <Text style={styles.kpiLabel}>COMPLETIONS</Text>
                </View>
              </View>

              {/* Risk Highlights */}
              <View style={styles.riskCard}>
                <View style={styles.riskHeader}>
                  <AlertTriangle size={18} color="#EF4444" style={{ marginRight: 8 }} />
                  <Text style={styles.riskTitle}>Compliance & Risk Indicators</Text>
                </View>

                <View style={styles.riskRow}>
                  <Text style={styles.riskItemLabel}>Overdue Mandatory Courses:</Text>
                  <Text style={styles.riskItemVal}>
                    {analytics.riskHighlights?.overdueMandatoryReels || 0}
                  </Text>
                </View>

                <View style={styles.riskRow}>
                  <Text style={styles.riskItemLabel}>Repeated Quiz Failures (Knowledge Gaps):</Text>
                  <Text style={styles.riskItemVal}>
                    {analytics.riskHighlights?.repeatedQuizFailures || 0}
                  </Text>
                </View>
              </View>

              {/* Compliance Audit Button */}
              <TouchableOpacity
                style={styles.openAuditBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setAuditModalVisible(true);
                }}
                activeOpacity={0.85}
              >
                <ShieldCheck size={22} color="#22C55E" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.openAuditTitle}>Open Compliance Audit Ledger</Text>
                  <Text style={styles.openAuditSub}>
                    View electronic sign-offs, export OSHA inspection records, and filter by department.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Tab: Training Tracks */}
      {activeTab === "paths" && (
        <ScrollView style={styles.contentArea} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.tracksHeaderWrap}>
            <Text style={styles.sectionTitle}>Curriculum Training Paths</Text>
            <Text style={styles.sectionSub}>
              Structured learning tracks that gate progression levels and certifications.
            </Text>
          </View>

          {loadingPaths ? (
            <ActivityIndicator size="large" color="#38BDF8" style={{ marginTop: 40 }} />
          ) : paths.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No training paths found.</Text>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {paths.map((p) => (
                <View key={p._id} style={styles.pathAdminCard}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.badgeRow}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{p.type?.toUpperCase()}</Text>
                      </View>
                      {p.required && (
                        <View style={styles.mandatoryBadge}>
                          <Text style={styles.mandatoryBadgeText}>MANDATORY</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.pathItemsCountText}>
                      {p.items?.length || 0} Steps
                    </Text>
                  </View>

                  <Text style={styles.reelTitleText}>{p.name}</Text>
                  <Text style={styles.reelDescText}>{p.description}</Text>

                  {/* Path Steps Preview */}
                  <View style={styles.stepsPreviewBox}>
                    {(p.items || []).map((stepItem: any, sIdx: number) => (
                      <View key={sIdx} style={styles.stepPreviewRow}>
                        <View style={styles.stepMiniNum}>
                          <Text style={styles.stepMiniNumText}>{sIdx + 1}</Text>
                        </View>
                        <Text style={styles.stepMiniTitle} numberOfLines={1}>
                          {stepItem.reelId?.title || "Training Reel"}
                        </Text>
                        {stepItem.requiredQuizId && (
                          <View style={styles.quizMiniPill}>
                            <Text style={styles.quizMiniPillText}>QUIZ</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <CompanyAuditReportModal
        visible={auditModalVisible}
        onClose={() => setAuditModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0F19",
  },
  tracksHeaderWrap: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  sectionSub: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
  },
  topTabs: {
    flexDirection: "row",
    backgroundColor: "#111827",
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#38BDF8",
  },
  tabText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#38BDF8",
    fontWeight: "700",
  },
  contentArea: {
    flex: 1,
    padding: 16,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterPill: {
    backgroundColor: "#1F2937",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: "#0284C7",
  },
  filterPillText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  reelsGrid: {
    gap: 12,
    paddingBottom: 40,
  },
  reelAdminCard: {
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  categoryBadge: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "700",
  },
  mandatoryBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mandatoryBadgeText: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "700",
  },
  reelTitleText: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  reelDescText: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    paddingTop: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  statusPill: {
    marginLeft: "auto",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: {
    color: "#22C55E",
    fontSize: 11,
    fontWeight: "700",
  },
  sectionHeader: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
  },
  inputLabel: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#FFFFFF",
    fontSize: 14,
  },
  twoCol: {
    flexDirection: "row",
    gap: 12,
  },
  categoryPickerWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  miniCatBtn: {
    backgroundColor: "#1F2937",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  miniCatBtnActive: {
    backgroundColor: "#0284C7",
  },
  miniCatText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  miniCatTextActive: {
    color: "#FFFFFF",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 10,
  },
  switchTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  switchDesc: {
    color: "#64748B",
    fontSize: 12,
  },
  quizSectionBox: {
    backgroundColor: "#111827",
    padding: 14,
    borderRadius: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  correctSelectRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
  },
  selectBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
  },
  selectBtnActive: {
    backgroundColor: "#16A34A",
  },
  selectBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  publishButton: {
    flexDirection: "row",
    backgroundColor: "#0284C7",
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  publishButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiCard: {
    width: "48%",
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
    alignItems: "center",
  },
  kpiVal: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  kpiLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  riskCard: {
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  riskHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  riskTitle: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "700",
  },
  riskRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  riskItemLabel: {
    color: "#CBD5E1",
    fontSize: 13,
  },
  riskItemVal: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyCard: {
    padding: 30,
    alignItems: "center",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
  },
  pathAdminCard: {
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  pathItemsCountText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
  },
  stepsPreviewBox: {
    marginTop: 12,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  stepPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepMiniNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  stepMiniNumText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  stepMiniTitle: {
    flex: 1,
    color: "#E2E8F0",
    fontSize: 13,
  },
  quizMiniPill: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  quizMiniPillText: {
    color: "#F59E0B",
    fontSize: 9,
    fontWeight: "800",
  },
  openAuditBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
    marginTop: 4,
  },
  openAuditTitle: {
    color: "#22C55E",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  openAuditSub: {
    color: "#94A3B8",
    fontSize: 11,
    lineHeight: 15,
  },
});
