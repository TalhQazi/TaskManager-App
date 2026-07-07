import { StyleProp, ViewStyle, TextStyle, ImageStyle } from "react-native";

export function s(...styles: Array<ViewStyle | TextStyle | ImageStyle | any>): any {
  const activeStyles = styles.filter(Boolean);
  
  return activeStyles.length === 1 ? activeStyles[0] : activeStyles;
}