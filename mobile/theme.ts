// Colours, fonts and spacing from docs/mockups/. Screens use these instead of raw values.

import type { Bin } from "@/lib/api";

export const colors = {
  background: "#F3F6EF", // soft mint page
  card: "#FFFFFF",
  text: "#17301F", // deep green-black headings
  textMuted: "#596C60",
  primary: "#2F7D4F", // buttons, progress bar, Scan button
  primarySoft: "#DDEBDD", // plant circle, avatar, number chips
  primaryBorder: "#B7CEB8",
  track: "#E4ECE2", // empty part of progress and "What you sort" bars
  terracotta: "#C46A45", // plant pot, e-waste bar
  dark: "#2B2B2B", // "Up next" bin icon
  cameraBg: "#0B130E",
  onPrimary: "#FFFFFF",
  danger: "#B3261E",
};

// Result card colour per bin. "unsure" is grey so it never looks like a real answer.
export const binColors: Record<Bin, string> = {
  blue_bin: "#2563A6",
  black_bin: "#2F3A33",
  green_bin: "#2F7D4F",
  garbage: "#6B6F6C",
  dropoff: "#C46A45",
  unsure: "#8A938C",
};

// "What you sort" bars
export const materialColors: Record<string, string> = {
  plastic: "#2563A6",
  paper: "#4F6356",
  metal: "#2F7D4F",
  glass: "#5FAE74",
  "e-waste": "#C46A45",
};

// Manrope is the closest Google font to the mockups' bold rounded sans.
// Loaded in app/_layout.tsx with these names.
export const fonts = {
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  extrabold: "Manrope_800ExtraBold",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

export const type = {
  title: { fontFamily: fonts.extrabold, fontSize: 26, color: colors.text },
  heading: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  body: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  caption: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  label: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted, letterSpacing: 0.5 },
  bigNumber: { fontFamily: fonts.extrabold, fontSize: 40, color: colors.text },
};
