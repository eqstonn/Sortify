// The page behind every screen: a flat beige background with four soft blobs
// tucked into the corners, traced from the mockups (assets/redesign/*.png).
//
// Each blob is its own small SVG pinned to a corner at a fixed size (in points),
// so on a wide browser window they stay in the corners instead of stretching.

import { StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useTheme } from "@/lib/theme";

type BlobShape = { w: number; h: number; d: string; at: ViewStyle; soft?: boolean };

// Sizes and paths in points, from the 390 x 844 pt mockup
const BLOBS: BlobShape[] = [
  // top left: beige, curling down to the left edge
  { w: 150, h: 124, at: { top: 0, left: 0 }, d: "M0 0H150C148 45 100 90 62 100C35 106 12 112 0 124Z" },
  // top right: a pale wave
  { w: 198, h: 77, at: { top: 0, right: 0 }, soft: true, d: "M0 0C38 40 98 72 168 76C183 77 193 76 198 75V0Z" },
  // right edge, a bit below the middle: a beige half-moon
  { w: 68, h: 186, at: { top: "46%", right: 0 }, d: "M68 0C28 7 0 42 0 90C0 140 30 177 68 186Z" },
  // bottom left: a large pale sweep
  { w: 302, h: 396, at: { bottom: 0, left: 0 }, soft: true, d: "M0 0C60 72 120 152 180 200C240 248 275 312 302 396H0Z" },
];

export default function Backdrop() {
  const { colors } = useTheme();
  return (
    <View style={[styles.fill, { backgroundColor: colors.page }]}>
      {BLOBS.map((b, i) => (
        <Blob key={i} shape={b} color={b.soft ? colors.blobSoft : colors.blob} />
      ))}
    </View>
  );
}

export function Blob({ shape, color }: { shape: BlobShape; color: string }) {
  return (
    <Svg width={shape.w} height={shape.h} viewBox={`0 0 ${shape.w} ${shape.h}`} style={[styles.blob, shape.at]}>
      <Path d={shape.d} fill={color} />
    </Svg>
  );
}

export type { BlobShape };

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, pointerEvents: "none" },
  blob: { position: "absolute" },
});
