// Preset registry — the single list of themes the app offers.
//
// The seven original presets are preserved exactly as users chose them; their raw values
// come from the existing contexts/ThemeContext.tsx definitions so nobody's saved
// preference changes appearance. What's new is:
//
//   1. `professional-light` — the modern SaaS/ERP default (blue on near-white).
//   2. Every preset now declares a `scheme` and a `border`, which is what lets
//      buildTokens() derive a full, accessible token set for all of them rather than
//      only the one the screen author happened to test against.

import type { PresetPalette } from "./tokens";

export type ThemePresetId =
  | "professional-light"
  | "dark-minimal"
  | "neon-tech"
  | "metallic-elite"
  | "executive-black"
  | "high-contrast"
  | "energy-mode"
  | "crystal-white";

export interface PresetMeta extends PresetPalette {
  id: ThemePresetId;
  label: string;
  description: string;
}

export const PRESETS: Record<ThemePresetId, PresetMeta> = {
  // The new default. Blue primary, near-white canvas, white cards, subtle grey borders —
  // #2563EB on #FFFFFF is 5.17:1, so button and link text clear WCAG AA.
  "professional-light": {
    id: "professional-light",
    label: "Professional Light",
    description: "Clean light workspace with a blue accent. Recommended.",
    scheme: "light",
    canvas: "#F6F8FA",
    surface: "#FFFFFF",
    primary: "#2563EB",
    text: "#111827",
    border: "#E4E7EC",
  },

  "dark-minimal": {
    id: "dark-minimal",
    label: "Dark Minimal",
    description: "Low-glare dark workspace.",
    scheme: "dark",
    canvas: "#09090B",
    surface: "#141517",
    primary: "#3B82F6",
    text: "#F8FAFC",
    border: "#26272B",
  },

  "neon-tech": {
    id: "neon-tech",
    label: "Neon Tech",
    description: "High-saturation cyan on deep navy.",
    scheme: "dark",
    canvas: "#090D16",
    surface: "#111827",
    primary: "#0EA5E9",
    text: "#E0F7FA",
    border: "#1E293B",
  },

  "metallic-elite": {
    id: "metallic-elite",
    label: "Metallic Elite",
    description: "Warm gold accents on charcoal.",
    scheme: "dark",
    canvas: "#09090B",
    surface: "#141517",
    primary: "#D4AF37",
    text: "#FFD27A",
    border: "#2A2A2A",
  },

  "executive-black": {
    id: "executive-black",
    label: "Executive Black",
    description: "Neutral greyscale, minimal colour.",
    scheme: "dark",
    canvas: "#000000",
    surface: "#111111",
    primary: "#64748B",
    text: "#F3F4F6",
    border: "#1F1F1F",
  },

  "high-contrast": {
    id: "high-contrast",
    label: "High Contrast",
    description: "Maximum legibility for accessibility needs.",
    scheme: "dark",
    canvas: "#000000",
    surface: "#000000",
    primary: "#FFFF00",
    text: "#FFFFFF",
    border: "#FFFFFF",
  },

  "energy-mode": {
    id: "energy-mode",
    label: "Energy Mode",
    description: "Warm amber on near-black.",
    scheme: "dark",
    canvas: "#0A0500",
    surface: "#1C120C",
    primary: "#F97316",
    text: "#FFEDD5",
    border: "#33200F",
  },

  "crystal-white": {
    id: "crystal-white",
    label: "Crystal White",
    description: "Bright white with deep navy accents.",
    scheme: "light",
    canvas: "#FFFFFF",
    surface: "#F8FAFC",
    primary: "#133767",
    text: "#000000",
    border: "#E2E8F0",
  },
};

/** The preset new installs start on. Existing users keep whatever they saved. */
export const DEFAULT_PRESET_ID: ThemePresetId = "professional-light";

/** Ordered list for the theme-engine picker; the recommended default leads. */
export const PRESET_LIST: PresetMeta[] = [
  PRESETS["professional-light"],
  PRESETS["dark-minimal"],
  PRESETS["crystal-white"],
  PRESETS["executive-black"],
  PRESETS["neon-tech"],
  PRESETS["metallic-elite"],
  PRESETS["energy-mode"],
  PRESETS["high-contrast"],
];

/** Tolerant lookup — unknown/legacy ids fall back to the default rather than crashing. */
export function resolvePreset(id: string | undefined | null): PresetMeta {
  return (id && PRESETS[id as ThemePresetId]) || PRESETS[DEFAULT_PRESET_ID];
}

/**
 * Whether a preset id renders on a dark canvas.
 *
 * Screens used to inline this as `theme !== "crystal-white"`, which was accurate only
 * while crystal-white was the single light preset. Any light preset added after that —
 * professional-light included — would have been treated as dark, painting light text
 * onto a white background. Ask the registry instead of hardcoding the exception.
 */
export function isDarkTheme(id: string | undefined | null): boolean {
  return resolvePreset(id).scheme === "dark";
}
