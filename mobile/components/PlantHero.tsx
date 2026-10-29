// Home's plant in a pot. It grows with the player's level (app/services/levels.py
// has 8, Seed to Forest): a taller stem and one more leaf at each level.

import { StyleSheet, View } from "react-native";

import { colors } from "@/theme";

const SIZE = 200; // the pale circle
const STEM = [0, 24, 38, 52, 66, 80, 92, 104]; // stem height per level
const LEAVES = [0, 2, 3, 4, 5, 6, 7, 8]; // leaves per level
const LEAF_GREENS = [colors.primary, "#5FAE74"];
const POT_BOTTOM = 14;
const POT_HEIGHT = 56;

export default function PlantHero({ level, name }: { level: number; name: string }) {
  const i = Math.min(Math.max(level, 1), STEM.length) - 1;
  const stem = STEM[i];
  const leaves = LEAVES[i];
  const leafWidth = 26 + i * 3;
  const soil = POT_BOTTOM + POT_HEIGHT - 6; // where the stem starts

  return (
    <View style={styles.circle} accessible accessibilityLabel={`Your plant: level ${level} ${name}`} testID="plant">
      {stem === 0 ? (
        <View style={[styles.seed, { bottom: soil }]} />
      ) : (
        <View style={[styles.stem, { height: stem, bottom: soil }]} />
      )}

      {Array.from({ length: leaves }, (_, n) => {
        const last = n === leaves - 1;
        // Leaves spread up the stem, alternating sides; the last one points straight up
        const along = leaves === 1 ? 1 : 0.3 + (0.7 * n) / (leaves - 1);
        const side = n % 2 === 0 ? -1 : 1;
        const width = last ? leafWidth * 0.8 : leafWidth;
        const height = width * 0.5;
        return (
          <View
            key={n}
            testID="plant-leaf"
            style={[
              styles.leaf,
              {
                width,
                height,
                borderRadius: height,
                backgroundColor: LEAF_GREENS[n % 2],
                bottom: soil + stem * along - height / 2 + (last ? height * 0.6 : 0),
                left: last ? SIZE / 2 - width / 2 : SIZE / 2 + (side < 0 ? -width : 0) + side * 2,
                transform: [{ rotate: last ? "90deg" : `${side * -28}deg` }],
              },
            ]}
          />
        );
      })}

      <View style={styles.rim} />
      <View style={styles.pot} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: colors.primarySoft, alignSelf: "center", overflow: "hidden" },
  stem: { position: "absolute", left: SIZE / 2 - 3, width: 6, borderRadius: 3, backgroundColor: "#3E8E5A" },
  seed: { position: "absolute", left: SIZE / 2 - 9, width: 18, height: 12, borderRadius: 9, backgroundColor: "#8A6D3B" },
  leaf: { position: "absolute" },
  rim: { position: "absolute", bottom: POT_BOTTOM + POT_HEIGHT - 16, left: SIZE / 2 - 50, width: 100, height: 16, borderRadius: 6, backgroundColor: "#D9805A" },
  pot: {
    position: "absolute",
    bottom: POT_BOTTOM,
    left: SIZE / 2 - 40,
    width: 80,
    height: POT_HEIGHT - 16,
    backgroundColor: colors.terracotta,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
});
