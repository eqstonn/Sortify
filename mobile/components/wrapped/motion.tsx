// The motion pieces every Wrapped card is built from (moti, which runs on
// react-native-reanimated, so it works in Expo Go and the browser):
//   <Rise>   enters once with a spring: up from below, in from a side, or a pop
//   <Loop>   moves back and forth (or spins) forever: drift, pulse, rotate
//   <Move>   one movement from A to B (confetti flying out, a blob swelling)
//   <CountUp>   a number that counts up to its value
// With the phone's Reduce Motion setting on, everything just appears in place.

import { type MotiTransitionProp, MotiView } from "moti";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Text, View } from "react-native";
import { Easing } from "react-native-reanimated";

// moti's transition types don't line up with this TypeScript/reanimated version
// (its spring/timing configs can't satisfy the intersection it declares), though
// the objects are exactly what moti's docs describe and work at runtime.
type TransitionSettings =
  | { type: "spring"; delay?: number; damping?: number; stiffness?: number; mass?: number }
  | { type: "timing"; delay?: number; duration: number; loop?: boolean; repeatReverse?: boolean; easing?: (t: number) => number };
const transition = (settings: TransitionSettings) => settings as unknown as MotiTransitionProp;

/** True when Reduce Motion is on (set by WrappedStory). */
export const StillContext = createContext(false);

type From = "below" | "above" | "left" | "right" | "pop";

const START: Record<From, Record<string, number>> = {
  below: { opacity: 0, translateY: 60 },
  above: { opacity: 0, translateY: -60 },
  left: { opacity: 0, translateX: -220 },
  right: { opacity: 0, translateX: 220 },
  pop: { opacity: 0, scale: 0.2 },
};
const END: Record<From, Record<string, number>> = {
  below: { opacity: 1, translateY: 0 },
  above: { opacity: 1, translateY: 0 },
  left: { opacity: 1, translateX: 0 },
  right: { opacity: 1, translateX: 0 },
  pop: { opacity: 1, scale: 1 },
};

type RiseProps = {
  from?: From;
  delay?: number; // ms: stagger siblings with i * 100 or so
  bouncy?: boolean; // more overshoot (the rarest find's pop)
  distance?: number; // how far a side or vertical entrance travels (default 220 sideways, 60 up/down)
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Rise({ from = "below", delay = 0, bouncy, distance, style, children }: RiseProps) {
  const still = useContext(StillContext);
  if (still) return <View style={style}>{children}</View>;
  const start = { ...START[from] };
  if (distance !== undefined && "translateX" in start) start.translateX = Math.sign(start.translateX) * distance;
  if (distance !== undefined && "translateY" in start) start.translateY = Math.sign(start.translateY) * distance;
  return (
    <MotiView
      style={style}
      from={start}
      animate={END[from]}
      transition={transition({ type: "spring", delay, damping: bouncy ? 9 : 15, stiffness: bouncy ? 160 : 120, mass: 0.9 })}
    >
      {children}
    </MotiView>
  );
}

type LoopProps = {
  from: Record<string, number | string>;
  to: Record<string, number | string>;
  duration: number;
  delay?: number;
  back?: boolean; // true: go back and forth; false: start over each time (spins, sonar rings)
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Loop({ from, to, duration, delay = 0, back = true, style, children }: LoopProps) {
  const still = useContext(StillContext);
  if (still) return <View style={style}>{children}</View>;
  return (
    <MotiView
      style={style}
      from={from}
      animate={to}
      transition={transition({
        type: "timing",
        duration,
        delay,
        loop: true,
        repeatReverse: back,
        // Spins and rings run at an even speed; drifts ease in and out
        easing: back ? Easing.inOut(Easing.sin) : Easing.linear,
      })}
    >
      {children}
    </MotiView>
  );
}

type Values = { opacity?: number; scale?: number; translateX?: number; translateY?: number };

type MoveProps = {
  from: Values;
  to: Values;
  delay?: number;
  duration?: number; // set: an even timed move; left out: a spring
  damping?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Move({ from, to, delay = 0, duration, damping = 14, style, children }: MoveProps) {
  const still = useContext(StillContext);
  if (still) {
    // Already where it ends up
    const { opacity = 1, scale = 1, translateX = 0, translateY = 0 } = to;
    return <View style={[style, { opacity, transform: [{ translateX }, { translateY }, { scale }] }]}>{children}</View>;
  }
  return (
    <MotiView
      style={style}
      from={from}
      animate={to}
      transition={transition(duration ? { type: "timing", duration, delay } : { type: "spring", delay, damping, stiffness: 110 })}
    >
      {children}
    </MotiView>
  );
}

type CountUpProps = {
  target: number;
  format: (value: number) => string;
  duration?: number;
  delay?: number;
  style?: StyleProp<TextStyle>;
  label: string; // what a screen reader says: the final value, not the moving one
  testID?: string;
};

/**
 * A number counting up. Its own component on purpose: it re-renders every
 * frame, and if the whole card did too, moti would restart the card's other
 * animations each frame.
 */
export function CountUp({ target, format, duration = 1400, delay = 0, style, label, testID }: CountUpProps) {
  const value = useCountUp(target, duration, delay);
  return (
    <Text style={style} allowFontScaling={false} accessibilityLabel={label} testID={testID}>
      {format(value)}
    </Text>
  );
}

/** Counts from 0 up to `target` over `duration` ms (easing out), after `delay` ms. */
function useCountUp(target: number, duration = 1400, delay = 0): number {
  const still = useContext(StillContext);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (still) return;
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min((now - start) / duration, 1);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => (frame = requestAnimationFrame(tick)), delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [target, duration, delay, still]);

  return still ? target : value;
}
