// A text box in the chunky style: cream fill, rounded, thin dark-green edge,
// an optional icon on the left (mail, lock), an optional label above ("Email"),
// and an optional thing on the right (the password's show/hide eye).
// Inputs have no band below them, like the mockup. While typing, the edge
// turns green and a little thicker (that's the focus indicator).

import type { LucideIcon } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { type StyleProp, Text, TextInput, type TextInputProps, View, type ViewStyle } from "react-native";

import { makeStyles, useTheme } from "@/lib/theme";
import { fonts, radius, spacing } from "@/theme";

type Props = TextInputProps & {
  label?: string;
  icon?: LucideIcon;
  right?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

export default function TextField({ label, icon: Icon, right, containerStyle, style, onFocus, onBlur, ...props }: Props) {
  const { colors } = useTheme();
  const s = useStyles();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[s.wrap, containerStyle]}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={[s.box, focused && s.focused]} testID="text-field-box">
        {Icon ? <Icon size={20} color={colors.text} strokeWidth={1.75} /> : null}
        <TextInput
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={props.accessibilityLabel ?? label}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[s.input, style]}
        />
        {right}
      </View>
    </View>
  );
}

const BORDER = 1;
const FOCUS_BORDER = 2;

const useStyles = makeStyles(({ colors }) => ({
  wrap: { gap: spacing.sm },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: BORDER,
    borderColor: colors.line,
    borderRadius: radius.md, // 16, like the mockup's sign-in boxes
  },
  // Thicker edge, minus the same amount of padding, so nothing inside moves
  focused: { borderWidth: FOCUS_BORDER, borderColor: colors.progress, paddingHorizontal: spacing.lg - (FOCUS_BORDER - BORDER) },
  // flex: 1 so a tap anywhere in the box's middle lands in the input
  input: {
    flex: 1,
    alignSelf: "stretch",
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.md,
    outlineWidth: 0, // web: the box's edge shows focus instead of the browser's square ring
  },
}));
