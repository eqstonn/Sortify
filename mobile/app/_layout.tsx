import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/manrope";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { SessionProvider, useSession } from "@/lib/session";
import { colors } from "@/theme";

// Keep the splash screen up until the fonts are ready, so text doesn't jump
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Screens />
    </SessionProvider>
  );
}

// Until the player has a name, the only screen is sign-in. Expo Router moves
// between the two groups by itself when signedIn changes.
function Screens() {
  const { signedIn } = useSession();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        {/* The centre tab button opens the camera over everything */}
        <Stack.Screen name="scan" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="result" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
