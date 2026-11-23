// The app's text buttons, as chunky cards:
// - "primary": deep-green gradient, cream text (the one main action on a screen: Sign in)
// - "secondary": cream with a green edge (Google, Skip, Not right?)
// - "accent": terracotta gradient
// "glass" is the old name for "secondary", kept until Wrapped and the scan screens are restyled.

import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { ActivityIndicator, type StyleProp, Text, View, type ViewStyle } from "react-native";

import Card, { type Tone } from "@/components/Card";
import { makeStyles, useTheme } from "@/lib/theme";
import { chunky, fonts, spacing } from "@/theme";

type Variant = "primary" | "secondary" | "accent" | "glass";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: LucideIcon;
  busy?: boolean; // shows a spinner instead of the label
  disabled?: boolean;
  accessibilityLabel?: string;
  children?: ReactNode; // extra content after the label, e.g. a "+15 pts" chip
  style?: StyleProp<ViewStyle>;
};

const TONES: Record<Variant, Tone> = { primary: "forest", secondary: "cream", accent: "terracotta", glass: "cream" };

export default function ActionButton({
  label, onPress, variant = "primary", icon: Icon, busy, disabled, accessibilityLabel, children, style,
}: Props) {
  const { colors } = useTheme();
  const s = useStyles();
  const tone = TONES[variant];
  const ink = tone === "forest" ? colors.onForest : tone === "terracotta" ? colors.onTerracotta : colors.text;
  const off = !!disabled || !!busy;

  return (
    <Card
      tone={tone}
      radius={20}
      depth={tone === "cream" ? chunky.band : chunky.bandButton}
      padding={0}
      onPress={onPress}
      disabled={off}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      style={[s.button, tone === "cream" ? s.light : s.solid, disabled && s.disabled, style]}
    >
      {busy ? (
        <ActivityIndicator color={ink} />
      ) : (
        <>
          {/* In a View: on web a bare icon would be painted under the gradient */}
          {Icon ? (
            <View>
              <Icon size={20} color={ink} strokeWidth={2} />
            </View>
          ) : null}
          <Text style={[s.label, { color: ink }]}>{label}</Text>
          {children}
        </>
      )}
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  button: {
    paddingHorizontal: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  solid: { minHeight: 54 }, // Sign in
  light: { minHeight: 48 }, // Google
  disabled: { opacity: 0.45 },
  label: { fontFamily: fonts.heading, fontSize: 17 },
}));
