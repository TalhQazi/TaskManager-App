import React from "react";
import { View, StyleSheet } from "react-native";
import { CompanyReelsFeed } from "@/components/company-reels/CompanyReelsFeed";

export default function CompanyReelsEmployeeScreen() {
  return (
    <View style={styles.container}>
      <CompanyReelsFeed />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
});
