import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Vibration, Platform } from "react-native";
import { Check } from "lucide-react-native"; // Mobile equivalent of lucide-react

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

// Replace with your design token / primary brand color configuration
const PRIMARY_COLOR = "#3B82F6"; 

export const TaskCompletionEffect: React.FC<TaskCompletionEffectProps> = ({
  x,
  y,
  onComplete,
  settings,
}) => {
  // 1. Shared Animation Drivers
  const pulseScale = useRef(new Animated.Value(0.5)).current;
  const pulseOpacity = useRef(new Animated.Value(0.8)).current;

  const glowScale = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const checkScale = useRef(new Animated.Value(0)).current;
  const checkRotate = useRef(new Animated.Value(0)).current; // 0 = -20deg, 1 = 0deg

  const particleProgress = useRef(new Animated.Value(0)).current; // 0 to 1

  // 2. Pre-calculate deterministic random particle paths (persists across re-renders)
  const particles = useRef(
    [...Array(6)].map(() => ({
      targetX: (Math.random() - 0.5) * 140,
      targetY: (Math.random() - 0.5) * 140,
    }))
  ).current;

  useEffect(() => {
    if (!settings.animationsEnabled) {
      onComplete();
      return;
    }

    // A. Trigger Native Haptics
    if (settings.hapticsEnabled) {
      // 40ms light feedback fallback. For premium haptics, consider 'expo-haptics' or 'react-native-haptic-feedback'
      Vibration.vibrate(Platform.OS === "android" ? 40 : [0, 40]); 
    }

    // B. Trigger Audio
    if (settings.soundEnabled) {
      playCompletionSound();
    }

    // C. Execute Accelerated Animations in Parallel
    Animated.parallel([
      // Pulse Ring
      Animated.timing(pulseScale, { toValue: 2.5, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),

      // Completion Glow (Fade-in keyframe sequence matching web `times: [0, 0.3, 1]`)
      Animated.timing(glowScale, { toValue: 1.5, duration: 1200, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.4, duration: 360, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0, duration: 840, useNativeDriver: true }),
      ]),

      // Checkmark Snap (Emulates web 'backOut' curve via snappy sequences)
      Animated.sequence([
        Animated.timing(checkScale, { toValue: 1.2, duration: 250, useNativeDriver: true }),
        Animated.timing(checkScale, { toValue: 1.0, duration: 150, useNativeDriver: true }),
      ]),
      Animated.timing(checkRotate, { toValue: 1, duration: 400, useNativeDriver: true }),

      // Exploding Particles
      Animated.timing(particleProgress, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start(() => {
      onComplete();
    });
  }, []);

  const playCompletionSound = () => {
    // NOTE: Web Audio API (AudioContext Oscillators) isn't supported out-of-the-box in native runtimes.
    // To handle sounds, play an audio clip asset using your framework's module:
    // EXPO: `const { sound } = await Audio.Sound.createAsync(require('@/assets/sounds/success.mp3')); await sound.playAsync();`
    // BARE RN: `import Sound from 'react-native-sound'; const s = new Sound('success.mp3', Sound.MAIN_BUNDLE, () => s.play());`
  };

  if (!settings.animationsEnabled) return null;

  // Interpolate numerical timelines to structural transform properties safely
  const interpolatedRotation = checkRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["-20deg", "0deg"],
  });

  const particleOpacity = particleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const particleScale = particleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.5],
  });

  return (
    // Creates an absolute zero-size pivot engine precisely on coordinate (X, Y)
    <View style={[styles.pivotContainer, { top: y, left: x }]}>
      
      {/* 1. Pulse Ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          },
        ]}
      />

      {/* 2. Completion Glow */}
      <Animated.View
        style={[
          styles.completionGlow,
          {
            transform: [{ scale: glowScale }],
            opacity: glowOpacity,
          },
        ]}
      />

      {/* 3. Precision Checkmark Lock-in */}
      <Animated.View
        style={{
          transform: [{ scale: checkScale }, { rotate: interpolatedRotation }],
        }}
      >
        <View style={styles.checkmarkWrapper}>
          <Check size={24} color={PRIMARY_COLOR} strokeWidth={3} />
        </View>
      </Animated.View>

      {/* 4. Subtle Particle Burst */}
      {particles.map((p, i) => {
        const moveX = particleProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.targetX],
        });
        const moveY = particleProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.targetY],
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                opacity: particleOpacity,
                transform: [{ translateX: moveX }, { translateY: moveY }, { scale: particleScale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  pivotContainer: {
    position: "absolute",
    width: 0,
    height: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  pulseRing: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: `${PRIMARY_COLOR}4D`, // Hex + 30% alpha opacity
  },
  completionGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${PRIMARY_COLOR}33`, // Hex + 20% alpha opacity
    // Note: Standard native style engines do not have layout blur filters. 
    // Opacity changes coupled with scaling perfectly emulate soft web blurs natively.
  },
  checkmarkWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 99,
    padding: 6,
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
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}1A`, // 10% opacity border
  },
  particle: {
    position: "absolute",
    width: 4,
    height: 4,
    backgroundColor: `${PRIMARY_COLOR}66`, // 40% opacity
    borderRadius: 2,
  },
});