import React, { useRef } from "react";
import { TouchableOpacity, Animated, StyleSheet, Platform } from "react-native";
import { Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTaskTheme } from "./theme";

interface CompleteCheckProps {
  completed: boolean;
  onToggle: () => void;
  size?: number;
  tone?: "default" | "danger";
}

export default function CompleteCheck({ completed, onToggle, size = 22, tone = "default" }: CompleteCheckProps) {
  const theme = useTaskTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.8, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    onToggle();
  };

  const activeColor = tone === "danger" ? theme.accent.danger : theme.accent.success;
  const ringColor = completed ? activeColor : theme.border.default;

  return (
    <TouchableOpacity
      onPress={handlePress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: completed }}
      accessibilityLabel={completed ? "Mark task incomplete" : "Mark task complete"}
    >
      <Animated.View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: ringColor,
            backgroundColor: completed ? activeColor : "transparent",
            transform: [{ scale }],
          },
        ]}
      >
        {completed && <Check size={size * 0.6} color="#FFFFFF" strokeWidth={3} />}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
