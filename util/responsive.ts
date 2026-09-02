import { Dimensions, PixelRatio } from "react-native";

const GLOBAL_FONT_SCALE = 0.95;

export const wp = (widthPercent: number): number => {
  const { width } = Dimensions.get("window");
  const elemWidth = typeof widthPercent === "number" ? widthPercent : parseFloat(widthPercent as any);
  // Cap effective scaling base width on wide screens/tablets so layout elements don't overscale
  const effectiveWidth = Math.min(width, 768);
  return PixelRatio.roundToNearestPixel((effectiveWidth * elemWidth) / 100);
};

export const hp = (heightPercent: number): number => {
  const { height } = Dimensions.get("window");
  const elemHeight = typeof heightPercent === "number" ? heightPercent : parseFloat(heightPercent as any);
  const effectiveHeight = Math.min(height, 1024);
  return PixelRatio.roundToNearestPixel((effectiveHeight * elemHeight) / 100);
};

export const fs = (fontSizePercent: number, minSize = 10, maxSize = 36): number => {
  const { width } = Dimensions.get("window");
  const effectiveWidth = Math.min(width, 768);
  const calculatedSize = ((effectiveWidth * fontSizePercent) / 100) * GLOBAL_FONT_SCALE;
  const clampedSize = Math.min(Math.max(calculatedSize, minSize), maxSize);
  return PixelRatio.roundToNearestPixel(clampedSize);
};