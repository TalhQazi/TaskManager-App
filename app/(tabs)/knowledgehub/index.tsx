import React, { useMemo } from "react";
import { StyleSheet, View, Text } from "react-native";
import PersonalNotes from "@/components/shared/PersonalNotes";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { s, wp, hp, fs } from "@/util/styles";

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0B0F17" : "#f8fafc"),
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#fafafa" : "#0f172a"),
    textSecondary: isDark ? "#9CA3AF" : "#475569",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    screenWrapper: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerPane: {
      paddingHorizontal: wp(4),
      paddingTop: hp(2),
      paddingBottom: hp(0.5),
      gap: hp(0.3),
    },
    mainTitle: {
      fontSize: fs(5.8),
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: fs(3.2),
      color: colors.textSecondary,
    },
    canvasContainer: {
      flex: 1,
    },
  });
}

export default function ManagerPersonalNotes() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme?.theme as string) === "dark" || (uiTheme?.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const getNotes = async () => {
    return apiFetch<{ items: any[] }>("/api/notes");
  };

  const createNote = async (payload: {
    title: string;
    content: string;
    color?: string;
    isPinned?: boolean;
    isFavorite?: boolean;
    folder?: string;
    tags?: string[];
    actionItems?: any[];
    notesList?: string[];
    attachments?: any[];
  }) => {
    return apiFetch<{ item: any }>("/api/notes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  };

  const updateNote = async (id: string, payload: any) => {
    return apiFetch<{ item: any }>(`/api/notes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  };

  const deleteNote = async (id: string) => {
    return apiFetch(`/api/notes/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  };

  return (
    <View style={s(styles.screenWrapper)}>
      <View style={s(styles.headerPane)}>
        <Text style={s(styles.mainTitle)}>Private Notes</Text>
        <Text style={s(styles.subtitle)}>Catch your ideas and private task drafts here.</Text>
      </View>

      <View style={s(styles.canvasContainer)}>
        <PersonalNotes
          getNotes={getNotes}
          createNote={createNote}
          updateNote={updateNote}
          deleteNote={deleteNote}
        />
      </View>
    </View>
  );
}