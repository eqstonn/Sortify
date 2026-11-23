// A segmented control where one option is picked: Board's This week / All time /
// Friends, the pickup weekday, the camera's Photo / Barcode.
// A cream pill with the chunky edge and band; the picked option is a deep-green pill.

import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { makeStyles, useTheme } from "@/lib/theme";
import { band, chunky, fonts, radius } from "@/theme";

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label?: string; // for screen readers
};

export default function Chips<T extends string>({ options, value, onChange, label }: Props<T>) {
  const { colors } = useTheme();
  const s = useStyles();
  return (
    <View style={s.row} accessibilityRole="tablist" accessibilityLabel={label}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          // A tab switch is frequent: instant change, no press animation
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={s.chip}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            {selected ? <LinearGradient colors={[colors.forestTop, colors.forestBottom]} style={s.selected} /> : null}
            <Text style={[s.text, selected && s.selectedText]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  row: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderWidth: chunky.stroke,
    borderColor: colors.line,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
    ...band(colors.band),
  },
  chip: { flex: 1, minHeight: 34, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  selected: { ...StyleSheet.absoluteFill, borderRadius: radius.pill },
  text: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
  selectedText: { color: colors.onForest },
}));
