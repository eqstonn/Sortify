// Design tokens: the colours, fonts, spacing, radius, type and motion every
// screen shares. Components never use raw colours: they read them with
// useTheme() / makeStyles() from lib/theme.tsx.
//
// The look ("cozy garden") comes from mobile/assets/redesign/*.png: a beige page
// with soft blobs, cream cards with a dark-green edge and a solid band under
// them, deep-green and terracotta accents. There is one theme (light); the app
// has no dark mode.

import type { BlurTint } from "expo-blur";
import type { TextStyle } from "react-native";

import type { Bin } from "@/lib/api";

/** Sortify Wrapped's poster colours: the theme's greens and terracotta, cream, sage and a marigold accent. */
export type WrappedPalette = {
  forest: string;
  deep: string;
  terracotta: string;
  clay: string;
  cream: string;
  sage: string;
  marigold: string;
  creamFaint: string;
  inkFaint: string;
};

export type Palette = {
  // ---- page ----
  page: string; // screen background
  blob: string; // the beige blobs in the corners
  blobSoft: string; // the paler cream blobs
  sheet: string; // the rounded-top panel that slides over the hero art
  handle: string; // the sheet's grab handle

  // ---- chunky cards (cards, tiles, rows, inputs, light buttons) ----
  card: string; // cream fill
  cardInset: string; // icon squares and circles sitting inside a card
  line: string; // the dark-green edge around cards
  band: string; // the solid "shadow" band straight below a card
  divider: string; // thin lines, e.g. "or continue with"

  // ---- deep green: primary button, nav bar, "You" row, highlighted tile ----
  forest: string;
  forestTop: string; // gradient, top
  forestBottom: string; // gradient, bottom
  forestEdge: string; // the edge around a green surface
  forestShine: string; // the 1 px lighter line along its top
  onForest: string; // text and icons on green
  onForestMuted: string; // nav labels that aren't selected
  navActive: string; // the pill behind the selected nav tab

  // ---- terracotta: level pill, Scan button, trash tile, links ----
  terracotta: string;
  terracottaTop: string;
  terracottaBottom: string;
  terracottaEdge: string;
  terracottaShine: string;
  onTerracotta: string;

  leaf: string; // leaf green, for small plant details
  progress: string; // mid green: progress fill, checked boxes, chart bars
  track: string; // empty part of progress bars

  // The default avatar: grey circle, white person
  avatarBg: string;
  avatarFg: string;

  // ---- shared by every screen ----
  background: string; // behind everything: on a wide browser window, the plain area either side of the app column
  text: string;
  textMuted: string;
  textFaint: string; // placeholders and disabled text only
  accent: string; // "active" green: spinners, selected states
  onAccent: string;
  accentSoft: string; // tinted chips, earned badges
  overlay: string; // dims the screen behind a pop-up sheet
  danger: string;
  gold: string; // #1 crown and ring
  statusBar: "dark";

  // ---- frosted glass: still used by Wrapped, the camera and the result screen ----
  glassFill: string;
  glassFallback: string;
  glassStrong: string;
  glassStrongFallback: string;
  glassBorder: string;
  glassInner: string;
  blurTint: BlurTint;
  wrapped: WrappedPalette; // Sortify Wrapped's poster colours
};

// Sampled from the mockups
const colors: Palette = {
  page: "#F0EFE7",
  blob: "#E9E4CD",
  blobSoft: "#F7F5EE",
  sheet: "#F5F3EA",
  handle: "#BFC2B6",

  card: "#FFFDF7",
  cardInset: "#ECEADF",
  line: "#2B3A24",
  band: "#BDC0B4",
  divider: "#CDCEC3",

  forest: "#1F3D2A",
  forestTop: "#2D5A40",
  forestBottom: "#1D3D2D",
  forestEdge: "#13291E",
  forestShine: "#507760",
  onForest: "#FFFDF7",
  onForestMuted: "#C6D8C4",
  navActive: "#50735D",

  terracotta: "#A9573B",
  terracottaTop: "#CC774E",
  terracottaBottom: "#8E4529",
  terracottaEdge: "#5E2C1A",
  terracottaShine: "#DDA184",
  onTerracotta: "#FFFDF7",

  leaf: "#5E8C3E",
  progress: "#2F5E43",
  track: "#E4E2D8",

  avatarBg: "#C4C8C1",
  avatarFg: "#FFFFFF",

  background: "#E2E0D6", // a shade darker than page, so the app column reads as a phone screen
  text: "#1F3D2A",
  textMuted: "#5B6B5F", // 4.9:1 on the page, 5.5:1 on cards
  textFaint: "#7D887F",
  accent: "#2F5E43",
  onAccent: "#FFFDF7",
  accentSoft: "rgba(47, 94, 67, 0.12)",
  overlay: "rgba(31, 61, 42, 0.35)",
  danger: "#B3261E",
  gold: "#E2B23C",
  statusBar: "dark",

  glassFill: "rgba(255, 253, 247, 0.6)",
  glassFallback: "rgba(255, 253, 247, 0.9)",
  glassStrong: "rgba(255, 253, 247, 0.75)",
  glassStrongFallback: "rgba(255, 253, 247, 0.96)",
  glassBorder: "rgba(43, 58, 36, 0.25)",
  glassInner: "rgba(255, 253, 247, 0.7)",
  blurTint: "light",
  wrapped: {
    forest: "#1F3D2A",
    deep: "#13291E",
    terracotta: "#A9573B",
    clay: "#8E4529", // a darker terracotta, for the rank card's checker
    cream: "#F4EEDC",
    sage: "#9DB88A",
    marigold: "#F2B33D", // the one bright accent
    creamFaint: "rgba(244, 238, 220, 0.35)", // progress bar tracks on dark cards
    inkFaint: "rgba(19, 41, 30, 0.22)", // ... and on light cards
  },
};

// Result card colour per bin: the answer is always a solid block.
// "unsure" is grey so it never looks like a real answer.
export const binColors: Record<Bin, string> = {
  blue_bin: "#2563A6",
  black_bin: "#2F3A33",
  green_bin: "#2F7D4F",
  garbage: "#6B6F6C",
  dropoff: "#B05A38", // deepened from #C46A45 so white text passes 4.5:1
  unsure: "#6E7771", // deepened from #8A938C so white text passes 4.5:1
};
export const onBin = "#FFFFFF"; // text on a bin colour
export const onBinSoft = "rgba(255, 255, 255, 0.18)"; // the icon square on a bin card
export const onBinEdge = "rgba(255, 255, 255, 0.25)"; // the bin card's 1px edge


// Loaded in app/_layout.tsx with these names.
// (Wrapped also uses fonts.poster, the heaviest Outfit, for its oversized type.)
// Outfit: headings, numbers, buttons. DM Sans: everything else.
export const fonts = {
  heading: "Outfit_600SemiBold",
  medium: "DMSans_500Medium",
  semibold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
  // Older names, still used by Wrapped and the scan screens until they're restyled
  light: "Outfit_400Regular",
  extrabold: "Outfit_700Bold",
  poster: "Outfit_900Black",
  posterBold: "Outfit_800ExtraBold",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = {
  sm: 8,
  inner: 12, // icon squares inside a card
  md: 16,
  tile: 20, // stat tiles
  button: 20,
  card: 24, // cards, rows, inputs
  sheet: 32, // the rounded top of the sheet
  pill: 999,
};

// The chunky card's edge and the solid band under it
export const chunky = {
  stroke: 1.5, // edge width
  band: 3, // how far the band shows below a card
  bandButton: 4, // buttons sit a little higher
  bandSmall: 2, // stat tiles
};

/** The solid band straight below a chunky card (a shadow with no blur). */
export function band(color: string, depth: number = chunky.band) {
  return { boxShadow: `0px ${depth}px 0px 0px ${color}` };
}

export const layout = {
  gutter: 20, // screen side padding
  maxContent: 500, // content column width cap on a wide (web) window; wider than any phone (Pro Max is 440), so phones always use the full width
};

export const motion = {
  pressScale: 0.96,
  pressMs: 150,
  enterMs: 300,
  exitMs: 150,
  crossfadeMs: 600,
};

function typeFor(c: Palette) {
  return {
    display: { fontFamily: fonts.heading, fontSize: 44, lineHeight: 50, letterSpacing: -0.5, color: c.text }, // Home's points
    title: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 34, letterSpacing: -0.3, color: c.text }, // screen titles
    stat: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 28, color: c.text }, // stat tile numbers
    heading: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 26, color: c.text }, // section titles
    cardTitle: { fontFamily: fonts.heading, fontSize: 16, lineHeight: 21, color: c.text }, // row and card titles
    body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: c.text },
    caption: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: c.textMuted },
    label: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 2, color: c.textMuted }, // "UP NEXT"
  } satisfies Record<string, TextStyle>;
}

export type TypeScale = ReturnType<typeof typeFor>;
export type Theme = { colors: Palette; type: TypeScale };

export const theme: Theme = { colors, type: typeFor(colors) };
