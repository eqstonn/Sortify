// A round glass button holding one icon: back, close, torch, edit, help.
// "accent" fills it with leaf green for the one action that matters most.

import { Feather } from "@expo/vector-icons";
import type { StyleProp, ViewStyle } from "react-native";

import { GlassLayers } from "@/components/GlassCard";
import PressableScale from "@/components/PressableScale";
import { makeStyles, useTheme } from "@/lib/theme";

type Props = {
  icon: keyof typeof Feather.glyphMap;
  label: string; // what a screen reader says
  onPress: () => void;
  size?: number;
  variant?: "glass" | "accent";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function GlassIconButton({ icon, label, onPress, size = 44, variant = "glass", disabled, style }: Props) {
  const { colors } = useTheme();
  const s = useStyles();
  const accent = variant === "accent";
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        s.button,
        { width: size, height: size, borderRadius: size / 2 },
        accent && { backgroundColor: colors.accent, borderColor: colors.accent },
        disabled && s.disabled,
        style,
      ]}
    >
      {accent ? null : <GlassLayers />}
      <Feather name={icon} size={Math.round(size * 0.45)} color={accent ? colors.onAccent : colors.text} />
    </PressableScale>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  button: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  disabled: { opacity: 0.45 },
}));
