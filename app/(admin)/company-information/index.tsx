import React from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import AssetLibrary from "./AssetLibrary"; 


export default function CompanyInformation() {
  return (
    <View style={styles.container}>
      <AssetLibrary 
        moduleName="company-information" 
        title="Company Information" 
        description="Upload, organize, preview, and download documents and notes." 
        hideHeaderCarousel={true} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF", // Matches your white/slate background defaults
  },
});