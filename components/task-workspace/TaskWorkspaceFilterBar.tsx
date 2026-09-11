import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
} from "react-native";
import {
  Search,
  X,
  ChevronDown,
  Check,
  CheckCircle,
  FilterX,
  Users,
} from "lucide-react-native";
import { useTaskWorkspace } from "./TaskWorkspaceContext";
import { useTaskTheme } from "@/components/tasks/theme";
import { apiRequest } from "@/services/api";

interface EmployeeOption {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { key: "all", label: "All Statuses" },
  { key: "pending", label: "Pending" },
  { key: "in-progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "overdue", label: "Overdue" },
];

const PRIORITY_OPTIONS = [
  { key: "all", label: "All Priorities" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

const DUE_DATE_OPTIONS = [
  { key: "all", label: "All Due Dates" },
  { key: "today", label: "Due Today" },
  { key: "week", label: "Next 7 Days" },
  { key: "overdue", label: "Overdue" },
];

export function TaskWorkspaceFilterBar() {
  const theme = useTaskTheme();
  const { filters, setFilters, resetFilters } = useTaskWorkspace();

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [modalType, setModalType] = useState<"assignee" | "status" | "priority" | "due" | null>(null);

  useEffect(() => {
    let mounted = true;
    apiRequest<any>("/employees")
      .then((res) => {
        if (!mounted) return;
        const raw = res?.data !== undefined ? res.data : res;
        const items = Array.isArray(raw) ? raw : raw?.items || [];
        setEmployees(
          items.map((e: any) => ({
            id: String(e.id || e._id || ""),
            name: e.name || "Unnamed",
          }))
        );
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleDueDateChange = (val: string) => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    if (val === "today") {
      setFilters({ dueFrom: todayStr, dueTo: todayStr, status: "all" });
    } else if (val === "week") {
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      setFilters({
        dueFrom: todayStr,
        dueTo: nextWeek.toISOString().slice(0, 10),
        status: "all",
      });
    } else if (val === "overdue") {
      setFilters({ dueFrom: undefined, dueTo: undefined, status: "overdue" });
    } else {
      setFilters({ dueFrom: undefined, dueTo: undefined });
    }
  };

  const isCorralActive = filters.status === "completed";
  const hasActiveFilters =
    (filters.search && filters.search.length > 0) ||
    (filters.status && filters.status !== "all") ||
    (filters.priority && filters.priority !== "all") ||
    (filters.assignment && filters.assignment !== "all") ||
    !!filters.dueFrom ||
    !!filters.dueTo;

  const currentAssigneeLabel =
    filters.assignment === "all" || !filters.assignment
      ? "All Assignees"
      : filters.assignment === "assigned"
      ? "Assigned"
      : filters.assignment === "unassigned"
      ? "Unassigned"
      : filters.assignment === "me"
      ? "Assigned to Me"
      : filters.assignment;

  const currentStatusLabel =
    STATUS_OPTIONS.find((s) => s.key === filters.status)?.label || "All Statuses";

  const currentPriorityLabel =
    PRIORITY_OPTIONS.find((p) => p.key === filters.priority)?.label || "All Priorities";

  const currentDueLabel = filters.dueFrom
    ? filters.dueFrom === filters.dueTo
      ? "Due Today"
      : "Next 7 Days"
    : filters.status === "overdue"
    ? "Overdue"
    : "All Due Dates";

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.surface, borderBottomColor: theme.border.default }]}>
      {/* Search Input Bar */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchInputWrapper,
            {
              backgroundColor: theme.bg.surfaceRaised,
              borderColor: theme.border.default,
            },
          ]}
        >
          <Search size={16} color={theme.text.tertiary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text.primary }]}
            placeholder="Search tasks by title, ID, or description…"
            placeholderTextColor={theme.text.tertiary}
            value={filters.search || ""}
            onChangeText={(text) => setFilters({ search: text })}
            returnKeyType="search"
          />
          {!!filters.search && (
            <TouchableOpacity
              onPress={() => setFilters({ search: "" })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={15} color={theme.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        {hasActiveFilters && (
          <TouchableOpacity
            style={[styles.clearBtn, { borderColor: theme.border.default }]}
            onPress={resetFilters}
            activeOpacity={0.7}
          >
            <FilterX size={14} color={theme.accent.danger} />
            <Text style={[styles.clearBtnText, { color: theme.accent.danger }]}>
              Reset
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterPills}
      >
        {/* Recently Completed Corral Button */}
        <TouchableOpacity
          style={[
            styles.corralBtn,
            isCorralActive
              ? {
                  backgroundColor: "#10B981",
                  borderColor: "#10B981",
                }
              : {
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  borderColor: "rgba(16, 185, 129, 0.3)",
                },
          ]}
          onPress={() => setFilters({ status: isCorralActive ? "all" : "completed" })}
          activeOpacity={0.7}
        >
          <CheckCircle size={13} color={isCorralActive ? "#FFFFFF" : "#10B981"} />
          <Text
            style={[
              styles.corralBtnText,
              { color: isCorralActive ? "#FFFFFF" : "#10B981" },
            ]}
          >
            Recently Completed Corral
          </Text>
        </TouchableOpacity>

        {/* Assignee Filter Pill */}
        <TouchableOpacity
          style={[
            styles.pill,
            {
              backgroundColor:
                filters.assignment && filters.assignment !== "all"
                  ? theme.accent.primarySoft
                  : theme.bg.surfaceRaised,
              borderColor:
                filters.assignment && filters.assignment !== "all"
                  ? theme.accent.primary
                  : theme.border.default,
            },
          ]}
          onPress={() => setModalType("assignee")}
          activeOpacity={0.7}
        >
          <Users
            size={13}
            color={
              filters.assignment && filters.assignment !== "all"
                ? theme.accent.primary
                : theme.text.secondary
            }
          />
          <Text
            style={[
              styles.pillText,
              {
                color:
                  filters.assignment && filters.assignment !== "all"
                    ? theme.accent.primary
                    : theme.text.secondary,
                fontWeight:
                  filters.assignment && filters.assignment !== "all"
                    ? "700"
                    : "500",
              },
            ]}
            numberOfLines={1}
          >
            {currentAssigneeLabel}
          </Text>
          <ChevronDown
            size={12}
            color={
              filters.assignment && filters.assignment !== "all"
                ? theme.accent.primary
                : theme.text.tertiary
            }
          />
        </TouchableOpacity>

        {/* Status Filter Pill */}
        <TouchableOpacity
          style={[
            styles.pill,
            {
              backgroundColor:
                filters.status && filters.status !== "all" && !isCorralActive
                  ? theme.accent.primarySoft
                  : theme.bg.surfaceRaised,
              borderColor:
                filters.status && filters.status !== "all" && !isCorralActive
                  ? theme.accent.primary
                  : theme.border.default,
            },
          ]}
          onPress={() => setModalType("status")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.pillText,
              {
                color:
                  filters.status && filters.status !== "all" && !isCorralActive
                    ? theme.accent.primary
                    : theme.text.secondary,
                fontWeight:
                  filters.status && filters.status !== "all" && !isCorralActive
                    ? "700"
                    : "500",
              },
            ]}
            numberOfLines={1}
          >
            {currentStatusLabel}
          </Text>
          <ChevronDown
            size={12}
            color={
              filters.status && filters.status !== "all" && !isCorralActive
                ? theme.accent.primary
                : theme.text.tertiary
            }
          />
        </TouchableOpacity>

        {/* Priority Filter Pill */}
        <TouchableOpacity
          style={[
            styles.pill,
            {
              backgroundColor:
                filters.priority && filters.priority !== "all"
                  ? theme.accent.primarySoft
                  : theme.bg.surfaceRaised,
              borderColor:
                filters.priority && filters.priority !== "all"
                  ? theme.accent.primary
                  : theme.border.default,
            },
          ]}
          onPress={() => setModalType("priority")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.pillText,
              {
                color:
                  filters.priority && filters.priority !== "all"
                    ? theme.accent.primary
                    : theme.text.secondary,
                fontWeight:
                  filters.priority && filters.priority !== "all"
                    ? "700"
                    : "500",
              },
            ]}
            numberOfLines={1}
          >
            {currentPriorityLabel}
          </Text>
          <ChevronDown
            size={12}
            color={
              filters.priority && filters.priority !== "all"
                ? theme.accent.primary
                : theme.text.tertiary
            }
          />
        </TouchableOpacity>

        {/* Due Date Filter Pill */}
        <TouchableOpacity
          style={[
            styles.pill,
            {
              backgroundColor:
                filters.dueFrom || filters.dueTo
                  ? theme.accent.primarySoft
                  : theme.bg.surfaceRaised,
              borderColor:
                filters.dueFrom || filters.dueTo
                  ? theme.accent.primary
                  : theme.border.default,
            },
          ]}
          onPress={() => setModalType("due")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.pillText,
              {
                color:
                  filters.dueFrom || filters.dueTo
                    ? theme.accent.primary
                    : theme.text.secondary,
                fontWeight: filters.dueFrom || filters.dueTo ? "700" : "500",
              },
            ]}
            numberOfLines={1}
          >
            {currentDueLabel}
          </Text>
          <ChevronDown
            size={12}
            color={
              filters.dueFrom || filters.dueTo
                ? theme.accent.primary
                : theme.text.tertiary
            }
          />
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Picker for Filter Selection */}
      <Modal
        visible={modalType !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setModalType(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalType(null)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.bg.surface, borderColor: theme.border.default },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {modalType === "assignee"
                  ? "Select Assignee"
                  : modalType === "status"
                  ? "Select Status"
                  : modalType === "priority"
                  ? "Select Priority"
                  : "Select Due Date Range"}
              </Text>
              <TouchableOpacity onPress={() => setModalType(null)}>
                <X size={20} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              {/* ASSIGNEE OPTIONS */}
              {modalType === "assignee" && (
                <View style={styles.optionsList}>
                  {[
                    { key: "all", label: "All Assignees" },
                    { key: "assigned", label: "Assigned Tasks" },
                    { key: "unassigned", label: "Unassigned Tasks" },
                    { key: "me", label: "Assigned to Me" },
                    ...employees.map((e) => ({ key: e.name, label: e.name })),
                  ].map((item) => {
                    const isSelected = (filters.assignment || "all") === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.optionItem,
                          {
                            backgroundColor: isSelected
                              ? theme.bg.surfaceRaised
                              : "transparent",
                          },
                        ]}
                        onPress={() => {
                          setFilters({ assignment: item.key });
                          setModalType(null);
                        }}
                      >
                        <Text
                          style={[
                            styles.optionLabel,
                            {
                              color: isSelected
                                ? theme.accent.primary
                                : theme.text.primary,
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                        {isSelected && (
                          <Check size={16} color={theme.accent.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* STATUS OPTIONS */}
              {modalType === "status" && (
                <View style={styles.optionsList}>
                  {STATUS_OPTIONS.map((item) => {
                    const isSelected = (filters.status || "all") === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.optionItem,
                          {
                            backgroundColor: isSelected
                              ? theme.bg.surfaceRaised
                              : "transparent",
                          },
                        ]}
                        onPress={() => {
                          setFilters({ status: item.key });
                          setModalType(null);
                        }}
                      >
                        <Text
                          style={[
                            styles.optionLabel,
                            {
                              color: isSelected
                                ? theme.accent.primary
                                : theme.text.primary,
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                        {isSelected && (
                          <Check size={16} color={theme.accent.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* PRIORITY OPTIONS */}
              {modalType === "priority" && (
                <View style={styles.optionsList}>
                  {PRIORITY_OPTIONS.map((item) => {
                    const isSelected = (filters.priority || "all") === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.optionItem,
                          {
                            backgroundColor: isSelected
                              ? theme.bg.surfaceRaised
                              : "transparent",
                          },
                        ]}
                        onPress={() => {
                          setFilters({ priority: item.key });
                          setModalType(null);
                        }}
                      >
                        <Text
                          style={[
                            styles.optionLabel,
                            {
                              color: isSelected
                                ? theme.accent.primary
                                : theme.text.primary,
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                        {isSelected && (
                          <Check size={16} color={theme.accent.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* DUE DATE OPTIONS */}
              {modalType === "due" && (
                <View style={styles.optionsList}>
                  {DUE_DATE_OPTIONS.map((item) => {
                    const isSelected =
                      (item.key === "all" && !filters.dueFrom && !filters.dueTo && filters.status !== "overdue") ||
                      (item.key === "today" && filters.dueFrom === filters.dueTo && !!filters.dueFrom) ||
                      (item.key === "week" && filters.dueFrom !== filters.dueTo && !!filters.dueFrom) ||
                      (item.key === "overdue" && filters.status === "overdue");

                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.optionItem,
                          {
                            backgroundColor: isSelected
                              ? theme.bg.surfaceRaised
                              : "transparent",
                          },
                        ]}
                        onPress={() => {
                          handleDueDateChange(item.key);
                          setModalType(null);
                        }}
                      >
                        <Text
                          style={[
                            styles.optionLabel,
                            {
                              color: isSelected
                                ? theme.accent.primary
                                : theme.text.primary,
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                        {isSelected && (
                          <Check size={16} color={theme.accent.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 38,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 10,
    gap: 6,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 13,
    paddingVertical: 0,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  filterPills: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: "center",
  },
  corralBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  corralBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    maxWidth: 120,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  optionsList: {
    gap: 4,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  optionLabel: {
    fontSize: 13.5,
  },
});
