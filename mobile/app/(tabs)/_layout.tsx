import { Tabs } from "expo-router/js-tabs";

import NavBar from "@/components/NavBar";
import { useTheme } from "@/lib/theme";

// Home, Board, [Scan], Wrapped, Me. Scan isn't a tab: NavBar draws it as
// the big centre button and opens app/scan.tsx. The nav floats over the
// screens, so each tab leaves room for it with useNavSpace().
export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <NavBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="board" options={{ title: "Board" }} />
      <Tabs.Screen name="wrapped" options={{ title: "Wrapped" }} />
      <Tabs.Screen name="me" options={{ title: "Me" }} />
    </Tabs>
  );
}
