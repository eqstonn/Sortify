// A stand-in screen until each tab is built (Phase 5 steps that follow).

import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radius, spacing, type } from "@/theme";

type Props = { eyebrow: string; title: string; children?: ReactNode; below?: ReactNode };

export default function Placeholder({ eyebrow, title, children, below }: Props) {
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <Text style={type.caption}>{eyebrow}</Text>
      <Text style={[type.title, styles.title]}>{title}</Text>
      <View style={styles.card}>{children ?? <Text style={type.caption}>Coming soon.</Text>}</View>
      {below ? <View style={styles.below}>{below}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  title: { marginTop: 2, marginBottom: spacing.lg },
  below: { marginTop: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
});
