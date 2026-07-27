/*import { StyleProp, ViewStyle, TextStyle, ImageStyle } from "react-native";
export function s(...styles: Array<ViewStyle | TextStyle | ImageStyle | any>): any {
  const activeStyles = styles.filter(Boolean);
  
  return activeStyles.length === 1 ? activeStyles[0] : activeStyles;
}*/

import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { wp, hp, fs } from "./responsive";
export { wp, hp, fs };

export function s(...styles: Array<ViewStyle | TextStyle | ImageStyle | any>): any {
  const activeStyles = styles.filter(Boolean);
  if (activeStyles.length === 0) return {};

  const flattened = StyleSheet.flatten(activeStyles);
  const processedStyles: Record<string, any> = {};

  for (const [key, value] of Object.entries(flattened)) {
    if (typeof value === "number") {
      if (key === "fontSize") {
        processedStyles[key] = fs((value / 375) * 100);
      } 
      else if (
        key.includes("paddingHorizontal") ||
        key.includes("marginHorizontal") ||
        key === "padding" ||
        key === "margin" ||
        key === "gap"
      ) {
        processedStyles[key] = wp((value / 375) * 100);
      }
      else if (key.includes("paddingVertical") || key.includes("marginVertical")) {
        processedStyles[key] = hp((value / 812) * 100);
      } 
      else {
        processedStyles[key] = value;
      }
    } else {
      processedStyles[key] = value;
    }
  }

  return processedStyles;
}