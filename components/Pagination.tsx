import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  style?: StyleProp<ViewStyle>;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  style,
}) => {
  const { uiTheme } = useTheme();
  const isDark = uiTheme.theme === "dark" || uiTheme.theme === "metallic-elite";

  const colors = useMemo(() => ({
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
    mutedText: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    primary: uiTheme.customColors?.primary || "#3b82f6",
    primaryText: "#ffffff",
    surface: isDark ? "#1e293b" : "#ffffff",
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showMax = 5;

    if (totalPages <= showMax) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.infoWrapper}>
        <Text style={styles.infoText}>
          Page <Text style={styles.boldText}>{currentPage}</Text> of{" "}
          <Text style={styles.boldText}>{totalPages}</Text>
        </Text>
      </View>
      
      <View style={styles.controlsRow}>
        <TouchableOpacity
          disabled={currentPage === 1}
          onPress={() => onPageChange(currentPage - 1)}
          style={[styles.navButton, currentPage === 1 && styles.disabledButton]}
          activeOpacity={0.7}
        >
          <ChevronLeft size={16} color={currentPage === 1 ? colors.mutedText : colors.text} />
        </TouchableOpacity>

        <View style={styles.pagesContainer}>
          {getPageNumbers().map((page, index) => {
            const isCurrent = currentPage === page;
            const isEllipsis = page === '...';

            if (isEllipsis) {
              return (
                <View key={`ellipsis-${index}`} style={styles.ellipsisContainer}>
                  <MoreHorizontal size={14} color={colors.mutedText} />
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={`page-${page}`}
                onPress={() => onPageChange(page as number)}
                style={[
                  styles.pageButton,
                  isCurrent ? styles.activePageButton : styles.inactivePageButton,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pageButtonText,
                    isCurrent ? styles.activePageButtonText : styles.inactivePageButtonText,
                  ]}
                >
                  {page}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          disabled={currentPage === totalPages}
          onPress={() => onPageChange(currentPage + 1)}
          style={[styles.navButton, currentPage === totalPages && styles.disabledButton]}
          activeOpacity={0.7}
        >
          <ChevronRight size={16} color={currentPage === totalPages ? colors.mutedText : colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    infoWrapper: {
      justifyContent: 'center',
    },
    infoText: {
      fontSize: 13,
      color: colors.mutedText,
    },
    boldText: {
      fontWeight: '600',
      color: colors.text,
    },
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    pagesContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    navButton: {
      width: 34,
      height: 34,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    disabledButton: {
      opacity: 0.4,
    },
    pageButton: {
      width: 34,
      height: 34,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activePageButton: {
      backgroundColor: colors.primary,
    },
    inactivePageButton: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    pageButtonText: {
      fontSize: 12,
      fontWeight: '600',
    },
    activePageButtonText: {
      color: colors.primaryText,
    },
    inactivePageButtonText: {
      color: colors.text,
    },
    ellipsisContainer: {
      width: 24,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}