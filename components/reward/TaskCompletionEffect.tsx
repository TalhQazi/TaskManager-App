import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Vibration, Platform } from "react-native";
import { Check } from "lucide-react-native";
import Colors from "@/constants/colors";

interface TaskCompletionEffectProps {
  x: number;
  y: number;
  onComplete: () => void;
  settings: {
    animationsEnabled: boolean;
    soundEnabled: boolean;
    hapticsEnabled: boolean;
  };
}

export const TaskCompletionEffect: React.FC<TaskCompletionEffectProps> = ({
  x,
  y,
  onComplete,
  settings,
}) => {
  // Animation timing nodes
  const pulseScale = useRef(new Animated.Value(0.5)).current;
  const pulseOpacity = useRef(new Animated.Value(0.8)).current;

  const glowScale = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const checkScale = useRef(new Animated.Value(0)).current;
  const checkRotate = useRef(new Animated.Value(0)).current;

  // Particle tracking nodes (6 particles generated programmatically)
  const particles = useRef(
    [...Array(6)].map(() => ({
      xy: new Animated.ValueXY({ x: 0, y: 0 }),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(1),
      targetX: (Math.random() - 0.5) * 120,
      targetY: (Math.random() - 0.5) * 120,
    }))
  ).current;

  useEffect(() => {
    // 1. Trigger Mobile Haptics Engine
    if (settings.hapticsEnabled) {
      if (Platform.OS === "android") {
        Vibration.vibrate(40); // 40ms light feedback line
      } else {
        // Fallback or selection trigger via standard device vibration array
        Vibration.vibrate([0, 35]); 
      }
    }

    // 2. Play Audio Feedback
    if (settings.soundEnabled) {
      playCompletionSound();
    }

    // 3. Orchestrate Layout Sequences
    if (settings.animationsEnabled) {
      Animated.parallel([
        // Pulse Ring Animation
        Animated.timing(pulseScale, {
          toValue: 2.5,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),

        // Glow Sequence Blend
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.4, duration: 300, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
        Animated.timing(glowScale, {
          toValue: 1.5,
          duration: 1200,
          useNativeDriver: true,
        }),

        // Checkmark Bounce Lock-In
        Animated.parallel([
          Animated.spring(checkScale, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(checkRotate, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),

        // Particle Burst Sequences
        ...particles.map((p) =>
          Animated.parallel([
            Animated.timing(p.xy, {
              toValue: { x: p.targetX, y: p.targetY },
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(p.opacity, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(p.scale, {
              toValue: 0.5,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start(() => {
        onComplete();
      });
    } else {
      // Immediate callback fallback if animations are manually switched off
      const timer = setTimeout(onComplete, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const playCompletionSound = () => {
    // Note: To use cross-platform audio feedback inside an Expo app, 
    // run `npx expo install expo-av` and invoke standard playback audio files.
    console.log("Play task audio confirmation snippet.");
  };

  if (!settings.animationsEnabled) return null;

  // Parse rotation interpolation string value
  const rotationDegrees = checkRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["-20deg", "0deg"],
  });

  const themePrimary = Colors.primary || "#1f6feb";

  return (
    <View style={[styles.effectContainer, { top: y, left: x }]}>
      {/* 1. Pulse Ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            borderColor: themePrimary,
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          },
        ]}
      />

      {/* 2. Completion Glow */}
      <Animated.View
        style={[
          styles.glowCircle,
          {
            backgroundColor: themePrimary,
            transform: [{ scale: glowScale }],
            opacity: glowOpacity,
          },
        ]}
      />

      {/* 3. Precision Checkmark Lock-in */}
      <Animated.View
        style={{
          transform: [{ scale: checkScale }, { rotate: rotationDegrees }],
        }}
      >
        <View style={[styles.checkmarkWrapper, { borderColor: `${themePrimary}1A` }]}>
          <Check size={24} color={themePrimary} strokeWidth={3} />
        </View>
      </Animated.View>

      {/* 4. Particle Burst Effects */}
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              backgroundColor: themePrimary,
              opacity: p.opacity,
              transform: [
                { translateX: p.xy.x },
                { translateY: p.xy.y },
                { scale: p.scale },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  effectContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  pulseRing: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    opacity: 0.8,
  },
  glowCircle: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    // Emulate blur layout style mechanics on mobile
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 4,
  },
  checkmarkWrapper: {
    backgroundColor: "#ffffff",
    borderRadius: 100,
    padding: 6,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  particle: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
});