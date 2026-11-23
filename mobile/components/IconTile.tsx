// A rounded square holding one icon: the terracotta trash tile on "Up next",
// the soft cream tiles on Discover weekly rows.

import type { LucideIcon } from "lucide-react-native";
import { type StyleProp, View, type ViewStyle } from "react-native";

import { useTheme } from "@/lib/theme";
import { radius } from "@/theme";

type Props = { icon: LucideIcon; tone?: "terracotta" | "soft"; size?: number; style?: StyleProp<ViewStyle> };

export default function IconTile({ icon: Icon, tone = "soft", size = 48, style }: Props) {
  const { colors } = useTheme();
  const terracotta = tone === "terracotta";
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: terracotta ? radius.inner : radius.md,
          backgroundColor: terracotta ? colors.terracotta : colors.cardInset,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Icon size={Math.round(size * 0.46)} color={terracotta ? colors.onTerracotta : colors.text} strokeWidth={2} />
    </View>
  );
}
