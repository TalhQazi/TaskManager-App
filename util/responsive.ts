import { Dimensions, PixelRatio } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const GLOBAL_FONT_SCALE = 0.95;

export const wp = (widthPercent: number): number => {
  const elemWidth = typeof widthPercent === "number" ? widthPercent : parseFloat(widthPercent);
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * elemWidth) / 100);
};

export const hp = (heightPercent: number): number => {
  const elemHeight = typeof heightPercent === "number" ? heightPercent : parseFloat(heightPercent);
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * elemHeight) / 100);
};


export const fs = (fontSizePercent: number, minSize = 10, maxSize = 36): number => {
  const calculatedSize = ((SCREEN_WIDTH * fontSizePercent) / 100) * GLOBAL_FONT_SCALE;
  const clampedSize = Math.min(Math.max(calculatedSize, minSize), maxSize);
  return PixelRatio.roundToNearestPixel(clampedSize);
};