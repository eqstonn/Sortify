// Home. For now it checks the backend and login are wired up, shows the
// points toast after a confirm and this week's Discover item; the plant,
// stats and "Up next" banner come next.

import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";

import DiscoverCard from "@/components/DiscoverCard";
import Placeholder from "@/components/Placeholder";
import PointsToast from "@/components/PointsToast";
import { api, ApiError, type DiscoverOut, type ProfileOut } from "@/lib/api";
import { clearPointsToast, usePointsToast } from "@/lib/pointsToast";
import { colors, type } from "@/theme";

type Status = { state: "loading" } | { state: "ok"; profile: ProfileOut } | { state: "error"; message: string };

export default function Home() {
  const [status, setStatus] = useState<Status>({ state: "loading" });
  const [discover, setDiscover] = useState<DiscoverOut | null>(null);
  const toast = usePointsToast();

  // Reload every time Home comes back into view, so points update after a scan
  useFocusEffect(
    useCallback(() => {
      // Discover is extra: if it fails, Home still works without the card
      api.discoverCurrent().then(setDiscover, () => setDiscover(null));
      (async () => {
        try {
          await api.health();
          setStatus({ state: "ok", profile: await api.me() });
        } catch (e) {
          setStatus({ state: "error", message: e instanceof ApiError || e instanceof Error ? e.message : String(e) });
        }
      })();
    }, []),
  );

  return (
    <View style={{ flex: 1 }}>
      <Placeholder
        eyebrow="Sortify"
        title="Your garden is growing"
        below={discover ? <DiscoverCard discover={discover} /> : null}
      >
        {status.state === "loading" && <Text style={type.caption}>Connecting to Sortify…</Text>}
        {status.state === "ok" && (
          <>
            <Text style={type.heading}>Connected ✓</Text>
            <Text style={type.body}>
              {status.profile.name} · {status.profile.total_points} points · Level {status.profile.level.number}{" "}
              {status.profile.level.name}
            </Text>
          </>
        )}
        {status.state === "error" && (
          <>
            <Text style={[type.heading, { color: colors.danger }]}>Not connected</Text>
            <Text style={type.body}>{status.message}</Text>
          </>
        )}
      </Placeholder>
      <PointsToast toast={toast} onHide={clearPointsToast} />
    </View>
  );
}
