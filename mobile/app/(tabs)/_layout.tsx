import { Tabs } from "expo-router/js-tabs";

import TabBar from "@/components/TabBar";
import { colors } from "@/theme";

// Home, Board, [Scan], Wrapped, Me. Scan isn't a tab: TabBar draws it as the
// raised centre button and opens app/scan.tsx.
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="board" options={{ title: "Board" }} />
      <Tabs.Screen name="wrapped" options={{ title: "Wrapped" }} />
      <Tabs.Screen name="me" options={{ title: "Me" }} />
    </Tabs>
  );
}
