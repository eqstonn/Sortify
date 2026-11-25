import { DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import { Outfit_400Regular, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold, Outfit_900Black } from "@expo-google-fonts/outfit";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import Splash from "@/components/Splash";
import { SessionProvider, useSession } from "@/lib/session";
import { useTheme } from "@/lib/theme";

// Keep the phone's own splash screen up until the fonts are ready, so text doesn't jump.
// Then our Splash (same look) stays while the saved login is checked.
SplashScreen.preventAutoHideAsync();

const SPLASH_MS = 2000;

export default function RootLayout() {
  // Outfit for headings and numbers, DM Sans for body text (names match `fonts` in theme.ts)
  const [loaded, error] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold, // Wrapped
    Outfit_900Black, // Wrapped
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SessionProvider>
      <Screens />
    </SessionProvider>
  );
}

// The screens you can reach depend on the login (lib/session.tsx). When it
// changes, Expo Router moves to the first screen you're allowed by itself
// (signed out: sign-in, since route files are tried in alphabetical order).
function Screens() {
  const { state } = useSession();
  const { colors } = useTheme();
  // The splash shows for at least a moment, so it doesn't just flicker
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), SPLASH_MS);
    return () => clearTimeout(t);
  }, []);
  const ready = state !== "loading";

  return (
    <>
      <StatusBar style={colors.statusBar} />
      {ready ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Protected guard={state === "signedIn"}>
            <Stack.Screen name="(tabs)" />
            {/* The centre nav button opens the camera over everything */}
            <Stack.Screen name="scan" options={{ presentation: "fullScreenModal" }} />
            <Stack.Screen name="result" />
          </Stack.Protected>
          <Stack.Protected guard={state === "signedOut"}>
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="sign-up" />
          </Stack.Protected>
          {/* Opened a "reset your password" link */}
          <Stack.Protected guard={state === "recovering"}>
            <Stack.Screen name="reset-password" />
          </Stack.Protected>
        </Stack>
      ) : null}
      <Splash visible={!ready || !shown} />
    </>
  );
}
