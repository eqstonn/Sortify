// A white stat card: big number, small label. Home uses three small ones, Me four big ones.

import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius, spacing, type } from "@/theme";

type Props = { value: string; label: string; highlight?: boolean; small?: boolean };

export default function StatTile({ value, label, highlight, small }: Props) {
  const color = highlight ? colors.onPrimary : colors.text;
  return (
    <View style={[styles.tile, small ? styles.small : styles.big, highlight && { backgroundColor: colors.primary }]}>
      <Text style={[styles.value, { color, fontSize: small ? 22 : 26 }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[type.caption, highlight && { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, gap: 2 },
  big: { flexBasis: "48%" },
  small: { flexBasis: 0, padding: spacing.md },
  value: { fontFamily: fonts.extrabold },
});
