// A rounded bar with a thin dark-green edge, filled in mid green from the left.
// Home's level bar and Me's "What you sort" bars.

import { type StyleProp, View, type ViewStyle } from "react-native";

import { makeStyles } from "@/lib/theme";
import { radius } from "@/theme";

type Props = {
  value: number; // 0 to 1
  height?: number;
  edge?: boolean; // the thin dark edge (Home's bar has one, the chart bars don't)
  label?: string; // for screen readers
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export default function ProgressBar({ value, height = 12, edge = true, label, style, testID }: Props) {
  const s = useStyles();
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  return (
    <View
      style={[s.track, edge && s.edge, { height, borderRadius: height / 2 }, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <View testID={testID} style={[s.fill, { width: `${percent}%` }]} />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  // overflow hidden: the fill is cut by the track's round ends
  track: { backgroundColor: colors.track, overflow: "hidden", borderRadius: radius.pill },
  edge: { borderWidth: 1, borderColor: colors.line },
  fill: { height: "100%", backgroundColor: colors.progress },
}));
