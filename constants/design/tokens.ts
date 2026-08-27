// Canonical design tokens.
//
// Background: the app carried four competing sources of colour truth —
// constants/colors.ts, constants/theme.ts, lib/theme.tsx, contexts/ThemeContext.tsx —
// plus ~7,700 hardcoded hex literals across app/ and components/. Screens drifted
// because there was no single place to change.
//
// This module is that place. It does NOT replace the theme engine: it derives a full
// semantic token set from whichever of the user's presets is active, so every preset
// (including the new professional-light default) yields consistent, accessible tokens
// instead of each screen inventing its own palette.
//
// Shape is modelled on components/tasks/theme.ts, which already proved out across the
// employee/manager/admin task portals — but parameterised by preset instead of hardcoded dark.

export type Scheme = "light" | "dark";

/** Raw per-preset input. Everything else in this file is derived from these six values. */
export interface PresetPalette {
  scheme: Scheme;
  /** Page background, behind all cards. */
  canvas: string;
  /** Default card / sheet background. */
  surface: string;
  /** Brand colour: primary buttons, active nav, focus rings, links. */
  primary: string;
  /** Highest-contrast body text on `canvas`/`surface`. */
  text: string;
  /** Hairline separators. */
  border: string;
}

// ---------------------------------------------------------------------------
// Spacing / radius / typography — preset-independent.
// ---------------------------------------------------------------------------

/** 4pt base grid. Use these instead of loose numeric literals in styles. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

/** Restrained radii — the brief calls out "excessive rounded corners" as a thing to avoid. */
export const radius = { sm: 6, md: 10, lg: 14, xl: 20, pill: 999 } as const;

/**
 * Minimum interactive target. Apple HIG says 44pt, Material says 48dp; this app is
 * native-mobile-first, so every pressable in components/ui enforces at least this.
 */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MIN_TOUCH = 44;

/**
 * Type ramp. Sizes are deliberately few — the brief asks for a consistent hierarchy,
 * and the previous drift came from ~30 distinct fontSize values across screens.
 */
export const type = {
  /** Screen title. One per screen. */
  pageTitle: { fontSize: 24, fontWeight: "700", lineHeight: 30 },
  /** Major section within a screen. */
  sectionTitle: { fontSize: 18, fontWeight: "700", lineHeight: 24 },
  /** Card / list-group heading. */
  cardTitle: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  /** Default body copy. */
  body: { fontSize: 15, fontWeight: "400", lineHeight: 21 },
  /** Body copy in dense contexts (table cells, list rows). */
  bodySm: { fontSize: 13, fontWeight: "400", lineHeight: 18 },
  /** Form labels, column headers. */
  label: { fontSize: 13, fontWeight: "600", lineHeight: 17 },
  /** Button text. */
  button: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  /** Secondary / supporting text. */
  caption: { fontSize: 13, fontWeight: "400", lineHeight: 18 },
  /** Timestamps, counts, badge text. */
  meta: { fontSize: 11, fontWeight: "500", lineHeight: 15 },
} as const;

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

/** #rgb / #rrggbb -> "rgba(r,g,b,a)". Falls back to the input if it isn't parseable. */
export function alpha(hex: string, a: number): string {
  const m = /^#?([a-f\d]{3}|[a-f\d]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Parse #rgb, #rrggbb, rgb(), or rgba() into [r,g,b]. Returns null if unrecognised. */
function toRgb(color: string): [number, number, number] | null {
  const c = color.trim();

  const hex = /^#?([a-f\d]{3}|[a-f\d]{6})$/i.exec(c);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(c);
  if (fn) return [Number(fn[1]), Number(fn[2]), Number(fn[3])];

  return null;
}

/** Relative luminance per WCAG 2.x. */
function luminance(hex: string): number {
  const rgb = toRgb(hex);
  if (!rgb) return 0;
  const chan = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}

/**
 * Whether a surface needs light-on-dark text.
 *
 * This asks the colour itself rather than trusting a preset's declared scheme. The two
 * can disagree: the theme engine lets a user keep a dark preset (and its accent) while
 * overriding the dashboard background to something light. Deciding text colour from the
 * preset id in that state paints white text onto a near-white canvas.
 *
 * Falls back to `fallback` for unparseable input (gradients, `transparent`, named colours).
 */
export function isDarkColor(color: string | undefined | null, fallback = false): boolean {
  if (!color || !toRgb(color)) return fallback;
  return luminance(color) < 0.4;
}

/** WCAG contrast ratio between two colours, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Pick whichever of black/white text is readable on `bg`.
 * Used so badges and filled buttons stay legible across all eight presets —
 * high-contrast (#ffff00 primary) and metallic-elite (#d4af37) both need dark text.
 */
export function onColor(bg: string): string {
  return contrastRatio(bg, "#ffffff") >= 4.5 ? "#ffffff" : "#111827";
}

// ---------------------------------------------------------------------------
// Semantic token derivation
// ---------------------------------------------------------------------------

/**
 * Status colours are intentionally fixed rather than derived: green-means-success is a
 * learned convention, and re-hueing it per preset would break recognition. Only their
 * *soft* backgrounds adapt, via alpha over the preset surface.
 */
const STATUS_HUES = {
  success: { light: "#15803D", dark: "#3FB950" },
  warning: { light: "#B45309", dark: "#D29922" },
  danger: { light: "#B91C1C", dark: "#F85149" },
  info: { light: "#1D4ED8", dark: "#388BFD" },
} as const;

export interface Tokens {
  scheme: Scheme;
  color: {
    canvas: string;
    surface: string;
    /** Cards sitting on top of another card (modals, popovers). */
    surfaceRaised: string;
    /** Inset wells — input fields, code blocks, table stripes. */
    surfaceSunken: string;
    /** Pressed/selected row background. */
    surfaceActive: string;
    /** Scrim behind modals and drawers. */
    overlay: string;

    border: string;
    borderSubtle: string;
    borderStrong: string;
    borderFocus: string;

    text: string;
    textSecondary: string;
    textTertiary: string;
    textDisabled: string;
    /** Text/icon colour on a `primary` fill. */
    textOnPrimary: string;

    primary: string;
    primaryHover: string;
    primarySoft: string;
    primaryBorder: string;

    success: string;
    successSoft: string;
    warning: string;
    warningSoft: string;
    danger: string;
    dangerSoft: string;
    info: string;
    infoSoft: string;
  };
  /** Ready-to-spread RN shadow props. Restrained per the brief's "unnecessary shadows". */
  elevation: {
    none: object;
    sm: object;
    md: object;
    lg: object;
  };
  space: typeof space;
  radius: typeof radius;
  type: typeof type;
}

/** Derive the full semantic token set from a preset's six raw values. */
export function buildTokens(p: PresetPalette): Tokens {
  const isDark = p.scheme === "dark";
  const hue = (k: keyof typeof STATUS_HUES) => STATUS_HUES[k][p.scheme];

  // On dark schemes, "raised" means lighter; on light schemes it stays white and the
  // canvas beneath it is what's grey. That inversion is why these are derived, not fixed.
  return {
    scheme: p.scheme,
    color: {
      canvas: p.canvas,
      surface: p.surface,
      surfaceRaised: isDark ? blend(p.surface, "#ffffff", 0.04) : "#ffffff",
      surfaceSunken: isDark ? blend(p.surface, "#000000", 0.35) : blend(p.canvas, "#000000", 0.02),
      surfaceActive: isDark ? alpha("#ffffff", 0.06) : alpha(p.primary, 0.07),
      overlay: alpha("#000000", isDark ? 0.7 : 0.45),

      border: p.border,
      borderSubtle: alpha(isDark ? "#ffffff" : "#000000", isDark ? 0.07 : 0.06),
      borderStrong: isDark ? blend(p.border, "#ffffff", 0.18) : blend(p.border, "#000000", 0.12),
      borderFocus: p.primary,

      text: p.text,
      textSecondary: alpha(p.text, isDark ? 0.68 : 0.62),
      textTertiary: alpha(p.text, isDark ? 0.48 : 0.45),
      textDisabled: alpha(p.text, 0.32),
      textOnPrimary: onColor(p.primary),

      primary: p.primary,
      primaryHover: isDark ? blend(p.primary, "#ffffff", 0.12) : blend(p.primary, "#000000", 0.12),
      primarySoft: alpha(p.primary, isDark ? 0.16 : 0.1),
      primaryBorder: alpha(p.primary, isDark ? 0.36 : 0.28),

      success: hue("success"),
      successSoft: alpha(hue("success"), isDark ? 0.16 : 0.11),
      warning: hue("warning"),
      warningSoft: alpha(hue("warning"), isDark ? 0.16 : 0.11),
      danger: hue("danger"),
      dangerSoft: alpha(hue("danger"), isDark ? 0.16 : 0.11),
      info: hue("info"),
      infoSoft: alpha(hue("info"), isDark ? 0.16 : 0.11),
    },
    elevation: {
      none: {},
      // Dark schemes read depth from borders, not shadows — shadows are invisible on
      // near-black. So elevation degrades to a no-op tint there and cards rely on borderSubtle.
      sm: isDark
        ? { }
        : { shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
      md: isDark
        ? { }
        : { shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 },
      lg: isDark
        ? { }
        : { shadowColor: "#0F172A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8 },
    },
    space,
    radius,
    type,
  };
}

/** Mix two hex colours. `amount` is how much of `b` to pull in (0–1). */
export function blend(a: string, b: string, amount: number): string {
  const parse = (hex: string) => {
    const m = /^#?([a-f\d]{3}|[a-f\d]{6})$/i.exec(hex.trim());
    if (!m) return null;
    let h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const ca = parse(a);
  const cb = parse(b);
  if (!ca || !cb) return a;
  const mix = ca.map((v, i) => Math.round(v + (cb[i] - v) * amount));
  return `#${mix.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
