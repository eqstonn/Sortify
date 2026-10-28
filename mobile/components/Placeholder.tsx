// A stand-in screen until each tab is built (Phase 5 steps that follow).

import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radius, spacing, type } from "@/theme";

export default function Placeholder({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <Text style={type.caption}>{eyebrow}</Text>
      <Text style={[type.title, styles.title]}>{title}</Text>
      <View style={styles.card}>{children ?? <Text style={type.caption}>Coming soon.</Text>}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  title: { marginTop: 2, marginBottom: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
});
