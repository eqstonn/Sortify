// Loading, error and pull-to-refresh for a screen that shows one API reply.
// Reloads whenever the tab comes into view, so points update after a scan.

import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

export type LoadStatus<T> = { state: "loading" } | { state: "ok"; data: T } | { state: "error"; message: string };

export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** `load` must be stable (useCallback), or the screen reloads on every render. */
export function useLoad<T>(load: () => Promise<T>) {
  const [status, setStatus] = useState<LoadStatus<T>>({ state: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(0); // only the newest request may update the screen

  const run = useCallback(async () => {
    const id = ++latest.current;
    try {
      const data = await load();
      if (id === latest.current) setStatus({ state: "ok", data });
    } catch (e) {
      if (id === latest.current) setStatus({ state: "error", message: errorText(e) });
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      run();
    }, [run]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await run();
    setRefreshing(false);
  }, [run]);

  const retry = useCallback(() => {
    setStatus({ state: "loading" });
    run();
  }, [run]);

  /** Swap in fresh data from a save (e.g. PATCH /me) without reloading. */
  const update = useCallback((change: (data: T) => T) => {
    latest.current++; // a reload already in flight would undo the save
    setStatus((s) => (s.state === "ok" ? { state: "ok", data: change(s.data) } : s));
  }, []);

  return { status, refreshing, refresh, retry, update };
}
