// A small rounded label: terracotta for the level ("Level 3 · Sapling"),
// green for small highlights.

import { type StyleProp, Text, View, type ViewStyle } from "react-native";

import { makeStyles, useTheme } from "@/lib/theme";
import { fonts, radius, spacing } from "@/theme";

type Props = { label: string; tone?: "terracotta" | "forest"; style?: StyleProp<ViewStyle>; testID?: string };

export default function Pill({ label, tone = "terracotta", style, testID }: Props) {
  const { colors } = useTheme();
  const s = useStyles();
  const bg = tone === "terracotta" ? colors.terracotta : colors.forest;
  const ink = tone === "terracotta" ? colors.onTerracotta : colors.onForest;
  return (
    <View style={[s.pill, { backgroundColor: bg }, style]} testID={testID}>
      <Text style={[s.text, { color: ink }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  pill: {
    alignSelf: "flex-start",
    minHeight: 28,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  text: { fontFamily: fonts.heading, fontSize: 14, lineHeight: 18 },
}));
