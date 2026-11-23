// A titled glass card on the backdrop: Wrapped uses it for its empty and error states.

import type { ReactNode } from "react";
import { Text, View } from "react-native";

import GlassCard from "@/components/GlassCard";
import Screen from "@/components/Screen";
import { makeStyles, useTheme } from "@/lib/theme";
import { layout, spacing } from "@/theme";

type Props = { eyebrow: string; title: string; children?: ReactNode; below?: ReactNode };

export default function Placeholder({ eyebrow, title, children, below }: Props) {
  const { type } = useTheme();
  const s = useStyles();
  return (
    <Screen style={s.screen}>
      <Text style={type.caption}>{eyebrow}</Text>
      <Text style={[type.title, s.title]}>{title}</Text>
      <GlassCard style={s.card}>{children ?? <Text style={type.caption}>Coming soon.</Text>}</GlassCard>
      {below ? <View style={s.below}>{below}</View> : null}
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  screen: { padding: layout.gutter },
  title: { marginTop: 2, marginBottom: spacing.lg },
  below: { marginTop: spacing.lg },
  card: { gap: spacing.sm },
}));
