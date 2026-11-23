// A chunky stat tile: big number top-left, a small icon top-right, a label below.
// Home has three small ones in a row; Me has four big ones in a 2x2 grid, with
// total points highlighted in deep green.

import type { LucideIcon } from "lucide-react-native";
import { Text, View } from "react-native";

import Card from "@/components/Card";
import { makeStyles, useTheme } from "@/lib/theme";
import { chunky, radius } from "@/theme";

type Props = { value: string; label: string; icon?: LucideIcon; highlight?: boolean; small?: boolean; testID?: string };

export default function StatTile({ value, label, icon: Icon, highlight, small, testID }: Props) {
  const { colors, type } = useTheme();
  const s = useStyles();
  const ink = highlight ? colors.onForest : colors.text;
  return (
    <Card
      tone={highlight ? "forest" : "cream"}
      radius={small ? radius.tile : radius.card}
      depth={small ? chunky.bandSmall : chunky.band}
      padding={small ? 12 : 16}
      style={[s.tile, small ? s.small : s.big]}
      testID={testID}
      accessible
      accessibilityLabel={`${value} ${label}`}
    >
      <View style={s.top}>
        <Text style={[type.stat, small ? s.smallValue : s.bigValue, { color: ink }]}>
          {value}
        </Text>
        {/* In a View: on web a bare icon would be painted under the green gradient */}
        {Icon ? (
          <View style={s.icon}>
            <Icon size={small ? 16 : 18} color={ink} strokeWidth={2} />
          </View>
        ) : null}
      </View>
      <Text style={[type.caption, s.label, highlight && { color: colors.onForest }]}>{label}</Text>
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  tile: { flexGrow: 1 },
  big: { flexBasis: "46%", minHeight: 84 },
  small: { flexBasis: 0, minHeight: 80 },
  top: { flexDirection: "row", alignItems: "flex-start" },
  // The icon floats in the corner so it never squeezes the number ("4 days" fits like the mockup)
  smallValue: { fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  bigValue: { fontSize: 30, lineHeight: 36 },
  icon: { position: "absolute", top: 2, right: 0 },
  label: { marginTop: 2 },
}));
