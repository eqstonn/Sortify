// The opening screen: the Sortify logo in the middle of the blob background
// (assets/redesign "Splash"). It covers the app while the saved login is
// checked, then fades away to sign-in or Home.

import { useEffect, useState } from "react";
import { Animated, StyleSheet } from "react-native";

import Backdrop from "@/components/Backdrop";
import Logo from "@/components/Logo";
import { useTheme } from "@/lib/theme";

const FADE_MS = 300;

export default function Splash({ visible }: { visible: boolean }) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(1));
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (visible) return;
    Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => setGone(true));
  }, [visible, opacity]);

  if (gone) return null;
  return (
    <Animated.View
      style={[styles.cover, { backgroundColor: colors.page, opacity }]}
      pointerEvents={visible ? "auto" : "none"}
      testID="splash"
    >
      <Backdrop />
      <Logo width={196} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", zIndex: 10 },
});
