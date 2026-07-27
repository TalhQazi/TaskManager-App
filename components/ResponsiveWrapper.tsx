import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";

export function ResponsiveWrapper({ children, style }: { children: React.ReactNode; style?: any }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.innerContainer, isTablet && styles.tabletContainer, style]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    alignItems: "center", 
    backgroundColor: "#09090b", 
  },
  innerContainer: {
    flex: 1,
    width: "100%",
  },
  tabletContainer: {
    maxWidth: 640, 
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
});