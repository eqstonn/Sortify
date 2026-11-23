// A Pressable that shrinks to 0.96 while held (150 ms, ease-out) and springs
// back on release. Disabled buttons don't move. With Reduce Motion on it dims
// instead of shrinking. Every tappable surface in the app uses this.

import { useState } from "react";
import { Animated, Easing, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

import { useReduceMotion } from "@/lib/useReduceMotion";
import { motion } from "@/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle> };

export default function PressableScale({ style, disabled, onPressIn, onPressOut, children, ...rest }: Props) {
  const reduce = useReduceMotion();
  const [pressed] = useState(() => new Animated.Value(0));

  const animate = (to: number) =>
    Animated.timing(pressed, {
      toValue: to,
      duration: motion.pressMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

  const feedback = reduce
    ? { opacity: pressed.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }) }
    : { transform: [{ scale: pressed.interpolate({ inputRange: [0, 1], outputRange: [1, motion.pressScale] }) }] };

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) animate(1);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animate(0);
        onPressOut?.(e);
      }}
      style={[style, feedback]}
    >
      {children}
    </AnimatedPressable>
  );
}
