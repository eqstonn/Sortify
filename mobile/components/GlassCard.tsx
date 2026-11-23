// Frosted glass: the backdrop blurred behind a translucent green (dark mode)
// or white (light mode) wash, with a soft 1px light edge and 28 px corners.
// Android's blur is weak and slow, so there it uses a denser solid wash instead.

import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { Platform, type StyleProp, StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";

import { makeStyles, useTheme } from "@/lib/theme";
import { radius, spacing } from "@/theme";

const BLUR = Platform.OS !== "android";
const INTENSITY = 40;

/** The blur and wash layers. Put inside any view with overflow: "hidden" and a radius. */
export function GlassLayers({ strong }: { strong?: boolean }) {
  const { colors } = useTheme();
  const wash = strong
    ? BLUR ? colors.glassStrong : colors.glassStrongFallback
    : BLUR ? colors.glassFill : colors.glassFallback;
  return (
    <>
      {BLUR ? <BlurView tint={colors.blurTint} intensity={INTENSITY} style={layers.fill} /> : null}
      <View style={[layers.fill, { backgroundColor: wash }]} />
    </>
  );
}

type Props = ViewProps & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  strong?: boolean; // denser glass, for bars that sit over scrolling content
  flat?: boolean; // no padding, for cards whose rows run edge to edge
};

export default function GlassCard({ children, style, strong, flat, ...rest }: Props) {
  const s = useStyles();
  return (
    <View {...rest} style={[s.card, !flat && s.padded, style]}>
      <GlassLayers strong={strong} />
      {children}
    </View>
  );
}

// Layers fill the card and never take taps
const layers = StyleSheet.create({ fill: { ...StyleSheet.absoluteFill, pointerEvents: "none" } });

const useStyles = makeStyles(({ colors }) => ({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: "hidden",
    gap: spacing.md,
  },
  padded: { padding: spacing.lg },
}));
