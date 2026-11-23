// The "chunky card" every redesigned screen is built from: a cream fill, big
// rounded corners, a dark-green edge, and a solid band straight below it (a
// shadow with no blur), like a tile sitting on the page.
//
// tone="forest" and tone="terracotta" swap the cream for a top-to-bottom
// gradient with a 1 px lighter line along the top (the primary button, the
// nav bar, the "You" row, the total-points tile).
//
// Pass onPress to make the whole card a button (it shrinks slightly while held).
//
// On a green or terracotta card, put icons inside a <View>: in the browser a
// bare icon is painted underneath the gradient layer.

import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";

import PressableScale from "@/components/PressableScale";
import { useTheme } from "@/lib/theme";
import { band, chunky, radius as radii, type Palette } from "@/theme";

export type Tone = "cream" | "forest" | "terracotta";

type Props = Omit<ViewProps, "style"> & {
  children?: ReactNode;
  tone?: Tone;
  radius?: number;
  depth?: number; // height of the band below; 0 for none
  padding?: number;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Edge, fill and gradient colours for each tone. */
export function toneColors(tone: Tone, c: Palette) {
  if (tone === "forest") return { edge: c.forestEdge, fill: c.forest, top: c.forestTop, bottom: c.forestBottom, shine: c.forestShine };
  if (tone === "terracotta")
    return { edge: c.terracottaEdge, fill: c.terracotta, top: c.terracottaTop, bottom: c.terracottaBottom, shine: c.terracottaShine };
  return { edge: c.line, fill: c.card, top: null, bottom: null, shine: null };
}

export default function Card({
  children, tone = "cream", radius = radii.card, depth = chunky.band, padding = 16, onPress, disabled, style, ...rest
}: Props) {
  const { colors } = useTheme();
  const t = toneColors(tone, colors);

  const frame: ViewStyle = {
    borderRadius: radius,
    borderWidth: chunky.stroke,
    borderColor: t.edge,
    backgroundColor: t.fill,
    // padding={0}: leave it out, so the caller's paddingLeft etc. apply (on web a padding: 0 beat them)
    ...(padding ? { padding } : null),
    ...(depth > 0 ? band(colors.band, depth) : null),
  };

  const content = (
    <>
      {t.top && t.bottom ? <Sheen top={t.top} bottom={t.bottom} shine={t.shine} radius={radius - chunky.stroke} /> : null}
      {children}
    </>
  );

  if (onPress) {
    return (
      <PressableScale {...rest} onPress={onPress} disabled={disabled} accessibilityRole={rest.accessibilityRole ?? "button"} style={[frame, style]}>
        {content}
      </PressableScale>
    );
  }
  return (
    <View {...rest} style={[frame, style]}>
      {content}
    </View>
  );
}

/** The gradient fill and the lighter line along the top of a green or terracotta surface. */
export function Sheen({ top, bottom, shine, radius }: { top: string; bottom: string; shine: string | null; radius: number }) {
  return (
    <>
      <LinearGradient colors={[top, bottom]} style={[styles.fill, { borderRadius: radius }]} />
      {shine ? <View style={[styles.fill, styles.shine, { borderRadius: radius, borderColor: shine }]} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, pointerEvents: "none" },
  // Only the top edge: with rounded corners it tapers off at the sides, like a highlight
  shine: { borderTopWidth: 1 },
});
