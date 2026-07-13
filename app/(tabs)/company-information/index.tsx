import React from "react";
import { View, StyleSheet } from "react-native";
import EmployeeAssetLibrary from "./AssetLibrary";

export default function EmployeeCompanyInformation() {
  return (
    <View style={styles.container}>
      <EmployeeAssetLibrary 
        moduleName="company-information" 
        title="Company Information" 
        description="View and download company documents." 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b" }
});