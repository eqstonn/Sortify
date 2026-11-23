// The opening screen: the Sortify logo in the middle of the blob background
// (assets/redesign "Splash"). It covers the app while the saved login is
// checked, then fades away to sign-in or Home.

import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

import Backdrop from "@/components/Backdrop";
import Logo from "@/components/Logo";
import { useTheme } from "@/lib/theme";
import { layout } from "@/theme";

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
      style={[styles.cover, { backgroundColor: colors.background, opacity }]}
      pointerEvents={visible ? "auto" : "none"}
      testID="splash"
    >
      {/* The same column as every screen (components/Screen.tsx), so on a wide window it matches */}
      <View style={styles.column}>
        <Backdrop />
        <Logo width={196} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, alignItems: "center", zIndex: 10 },
  column: { flex: 1, width: "100%", maxWidth: layout.maxContent, alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
