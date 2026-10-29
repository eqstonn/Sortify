// The spinner and the "Couldn't load" card that every tab shows before its data arrives.

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, fonts, radius, spacing, type } from "@/theme";

export function Loading() {
  return (
    <View style={styles.center} testID="loading">
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.card}>
        <Text style={type.heading}>{title}</Text>
        <Text style={type.body}>{message}</Text>
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, justifyContent: "center" },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.sm },
  buttonText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onPrimary },
});
