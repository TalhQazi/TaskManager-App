import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react-native";
import { useTokens } from "@/contexts/ThemeContext";
import { HolidayItem } from "@/lib/admin/apiClient";
import HolidayCard from "./HolidayCard";
import * as Haptics from "expo-haptics";

interface HolidayCalendarViewProps {
  holidays: HolidayItem[];
  onSelectHoliday: (holiday: HolidayItem) => void;
  onEditHoliday?: (holiday: HolidayItem) => void;
  onDeleteHoliday?: (holiday: HolidayItem) => void;
  isAdmin?: boolean;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function HolidayCalendarView({
  holidays,
  onSelectHoliday,
  onEditHoliday,
  onDeleteHoliday,
  isAdmin = false,
}: HolidayCalendarViewProps) {
  const tokens = useTokens();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDay(null);
  };

  // Map holidays into dates for this specific month
  const holidaysByDay = useMemo(() => {
    const map: Record<number, HolidayItem[]> = {};

    holidays.forEach((h) => {
      if (!h.calculatedDates?.startDateStr) return;
      const [y, m, d] = h.calculatedDates.startDateStr.split("-").map(Number);
      const [endY, endM, endD] = (h.calculatedDates.endDateStr || h.calculatedDates.startDateStr)
        .split("-")
        .map(Number);

      // Check if starts in this month or spans into this month
      const start = new Date(y, m - 1, d);
      const end = new Date(endY, endM - 1, endD);

      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);

      // Overlaps with current month
      if (end >= monthStart && start <= monthEnd) {
        // Find which days of this month overlap
        for (let day = 1; day <= monthEnd.getDate(); day++) {
          const testDate = new Date(currentYear, currentMonth, day);
          if (testDate >= start && testDate <= end) {
            if (!map[day]) map[day] = [];
            map[day].push(h);
          }
        }
      }
    });

    return map;
  }, [holidays, currentYear, currentMonth]);

  // Calendar days calculation
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const cells: {
      day: number;
      isCurrentMonth: boolean;
      holidays: HolidayItem[];
    }[] = [];

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        holidays: [],
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        day,
        isCurrentMonth: true,
        holidays: holidaysByDay[day] || [],
      });
    }

    // Trailing days to fill remaining grid
    const remaining = 42 - cells.length; // 6 rows * 7
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        holidays: [],
      });
    }

    return cells;
  }, [currentYear, currentMonth, holidaysByDay]);

  const selectedDayHolidays = selectedDay ? holidaysByDay[selectedDay] || [] : [];
  const allMonthHolidays = useMemo(() => {
    const uniqueMap = new Map<string, HolidayItem>();
    Object.values(holidaysByDay).forEach((list) => {
      list.forEach((h) => uniqueMap.set(h.id, h));
    });
    return Array.from(uniqueMap.values());
  }, [holidaysByDay]);

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth &&
      today.getFullYear() === currentYear
    );
  };

  return (
    <View style={styles.container}>
      {/* Month Navigation Header */}
      <View style={[styles.headerRow, { backgroundColor: tokens.cardBackground, borderColor: tokens.cardBorder }]}>
        <TouchableOpacity
          onPress={handlePrevMonth}
          style={[styles.navBtn, { borderColor: tokens.border }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={18} color={tokens.textPrimary} />
        </TouchableOpacity>

        <View style={styles.monthTitleContainer}>
          <Text style={[styles.monthTitle, { color: tokens.textPrimary }]}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </Text>
          <Text style={[styles.holidayCountSubtitle, { color: tokens.textMuted }]}>
            {allMonthHolidays.length} {allMonthHolidays.length === 1 ? "holiday" : "holidays"} this month
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleNextMonth}
          style={[styles.navBtn, { borderColor: tokens.border }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronRight size={18} color={tokens.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Days of Week Header */}
      <View style={styles.daysHeader}>
        {DAYS_OF_WEEK.map((d, index) => (
          <Text
            key={d}
            style={[
              styles.dayOfWeekText,
              { color: index === 0 || index === 6 ? tokens.textMuted : tokens.textSecondary },
            ]}
          >
            {d}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={[styles.grid, { backgroundColor: tokens.cardBackground, borderColor: tokens.cardBorder }]}>
        {calendarCells.map((cell, idx) => {
          if (!cell.isCurrentMonth) {
            return (
              <View key={`cell-${idx}`} style={styles.cellMuted}>
                <Text style={[styles.cellTextMuted, { color: tokens.border }]}>{cell.day}</Text>
              </View>
            );
          }

          const hasHolidays = cell.holidays.length > 0;
          const isSelected = selectedDay === cell.day;
          const todayCell = isToday(cell.day);

          return (
            <TouchableOpacity
              key={`cell-${idx}`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedDay(cell.day);
              }}
              style={[
                styles.cell,
                isSelected && {
                  backgroundColor: "rgba(59, 130, 246, 0.2)",
                  borderColor: tokens.primary,
                },
                todayCell && !isSelected && {
                  borderColor: "#ef4444",
                },
                hasHolidays && !isSelected && {
                  backgroundColor: "rgba(168, 85, 247, 0.08)",
                },
              ]}
            >
              <Text
                style={[
                  styles.cellText,
                  { color: tokens.textPrimary },
                  todayCell && { color: "#ef4444", fontWeight: "700" },
                  isSelected && { color: tokens.primary, fontWeight: "700" },
                ]}
              >
                {cell.day}
              </Text>

              {/* Holiday indicators */}
              {hasHolidays && (
                <View style={styles.dotContainer}>
                  {cell.holidays.slice(0, 3).map((h, dotIdx) => {
                    const dotColor =
                      h.religion_category === "religious"
                        ? "#a855f7"
                        : h.religion_category === "cultural"
                        ? "#10b981"
                        : "#3b82f6";
                    return (
                      <View
                        key={`dot-${h.id}-${dotIdx}`}
                        style={[styles.holidayDot, { backgroundColor: dotColor }]}
                      />
                    );
                  })}
                  {cell.holidays.length > 3 && (
                    <Text style={[styles.moreDotsText, { color: tokens.primary }]}>+</Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Day or Month Overview List */}
      <View style={styles.selectionSection}>
        <View style={styles.selectionHeader}>
          <Text style={[styles.selectionTitle, { color: tokens.textPrimary }]}>
            {selectedDay
              ? `Holidays on ${MONTH_NAMES[currentMonth]} ${selectedDay}`
              : `All Holidays in ${MONTH_NAMES[currentMonth]}`}
          </Text>

          {selectedDay && (
            <TouchableOpacity
              onPress={() => setSelectedDay(null)}
              style={styles.viewAllBtn}
            >
              <Text style={[styles.viewAllText, { color: tokens.primary }]}>View All Month</Text>
            </TouchableOpacity>
          )}
        </View>

        {(selectedDay ? selectedDayHolidays : allMonthHolidays).length === 0 ? (
          <View style={[styles.emptyDayBox, { borderColor: tokens.border }]}>
            <CalendarIcon size={20} color={tokens.textMuted} style={{ marginBottom: 6 }} />
            <Text style={[styles.emptyDayText, { color: tokens.textMuted }]}>
              {selectedDay
                ? `No holidays scheduled on ${MONTH_NAMES[currentMonth]} ${selectedDay}.`
                : `No holidays scheduled in ${MONTH_NAMES[currentMonth]} ${currentYear}.`}
            </Text>
          </View>
        ) : (
          (selectedDay ? selectedDayHolidays : allMonthHolidays).map((h) => (
            <HolidayCard
              key={h.id}
              holiday={h}
              onPress={onSelectHoliday}
              onEdit={onEditHoliday}
              onDelete={onDeleteHoliday}
              isAdmin={isAdmin}
            />
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitleContainer: {
    alignItems: "center",
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  holidayCountSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  daysHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    marginBottom: 6,
  },
  dayOfWeekText: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  cell: {
    width: "14.28%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "rgba(148, 163, 184, 0.1)",
  },
  cellMuted: {
    width: "14.28%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  cellText: {
    fontSize: 13,
    fontWeight: "500",
  },
  cellTextMuted: {
    fontSize: 12,
    opacity: 0.4,
  },
  dotContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
    height: 6,
  },
  holidayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  moreDotsText: {
    fontSize: 8,
    fontWeight: "700",
    marginLeft: 1,
  },
  selectionSection: {
    marginTop: 4,
  },
  selectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  selectionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  viewAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyDayBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 6,
  },
  emptyDayText: {
    fontSize: 13,
    textAlign: "center",
  },
});
