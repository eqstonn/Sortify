// The Sortify wordmark, drawn straight from assets/redesign/sortify-logo.svg
// (expo-image can show SVG files on iOS, Android and web).

import { Image, type ImageStyle } from "expo-image";
import type { StyleProp } from "react-native";

const LOGO = require("../assets/redesign/sortify-logo.svg");
const RATIO = 319.5 / 101.6; // the SVG's viewBox width / height

export default function Logo({ width = 140, style }: { width?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={LOGO}
      style={[{ width, height: width / RATIO }, style]}
      contentFit="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel="Sortify"
      testID="logo"
    />
  );
}
