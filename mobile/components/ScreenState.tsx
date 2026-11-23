// The spinner and the "Couldn't load" glass card every tab shows before its data arrives.

import { ActivityIndicator, Text, View } from "react-native";

import ActionButton from "@/components/ActionButton";
import GlassCard from "@/components/GlassCard";
import Screen from "@/components/Screen";
import { makeStyles, useTheme } from "@/lib/theme";
import { layout, spacing } from "@/theme";

export function Loading() {
  const { colors } = useTheme();
  const s = useStyles();
  return (
    <Screen>
      <View style={s.center} testID="loading">
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    </Screen>
  );
}

export function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  const { type } = useTheme();
  const s = useStyles();
  return (
    <Screen style={s.middle}>
      <GlassCard style={s.card}>
        <Text style={type.heading}>{title}</Text>
        <Text style={type.body}>{message}</Text>
        <ActionButton label="Try again" onPress={onRetry} style={s.button} />
      </GlassCard>
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  middle: { justifyContent: "center", padding: layout.gutter },
  card: { padding: spacing.xl },
  button: { marginTop: spacing.sm },
}));
