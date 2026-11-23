// Sortify Wrapped: this month's five story cards. Early in a month this
// month is still empty, so it falls back to last month.

import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Text } from "react-native";

import ActionButton from "@/components/ActionButton";
import Placeholder from "@/components/Placeholder";
import { Loading } from "@/components/ScreenState";
import WrappedStory from "@/components/WrappedStory";
import { api, ApiError, type WrappedOut } from "@/lib/api";
import { makeStyles, useTheme } from "@/lib/theme";
import { monthName, wrappedMonths } from "@/lib/wrapped";
import { spacing } from "@/theme";

type Status =
  | { state: "loading" }
  | { state: "ok"; data: WrappedOut }
  | { state: "empty"; month: number }
  | { state: "error"; message: string };

export default function Wrapped() {
  const [status, setStatus] = useState<Status>({ state: "loading" });
  const { type } = useTheme();
  const s = useStyles();

  const load = useCallback(async () => {
    setStatus({ state: "loading" }); // also sends the story back to card 1
    try {
      const months = wrappedMonths(new Date());
      for (const { year, month } of months) {
        const data = await api.wrapped(year, month);
        if (data.items > 0) return setStatus({ state: "ok", data });
      }
      setStatus({ state: "empty", month: months[0].month });
    } catch (e) {
      setStatus({ state: "error", message: e instanceof ApiError || e instanceof Error ? e.message : String(e) });
    }
  }, []);

  // Reload whenever the tab comes back into view, so new scans show up
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (status.state === "ok") return <WrappedStory data={status.data} onClose={() => router.navigate("/")} />;

  if (status.state === "loading") return <Loading />;

  if (status.state === "empty") {
    return (
      <Placeholder eyebrow="Sortify Wrapped" title={`Your ${monthName(status.month)} is just getting started`}>
        <Text style={type.body}>Sort a few items and your monthly recap fills in here.</Text>
      </Placeholder>
    );
  }

  return (
    <Placeholder eyebrow="Sortify Wrapped" title="Couldn't load your Wrapped">
      <Text style={type.body}>{status.message}</Text>
      <ActionButton label="Try again" onPress={load} style={s.retry} />
    </Placeholder>
  );
}

const useStyles = makeStyles(() => ({
  retry: { marginTop: spacing.sm },
}));
