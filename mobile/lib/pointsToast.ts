// "I recycled it" on the result screen queues a toast; Home shows it when you land there.

import { useSyncExternalStore } from "react";

export type PointsToastData = {
  points: number; // awarded for this scan, can be 0 (daily cap, same photo twice)
  total: number;
  notes: string[]; // from the backend, e.g. "+15 bonus for your first aluminum can!"
};

let pending: PointsToastData | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function showPointsToast(toast: PointsToastData) {
  pending = toast;
  emit();
}

export function clearPointsToast() {
  pending = null;
  emit();
}

/** The toast waiting to be shown, or null. Re-renders when one arrives or is cleared. */
export function usePointsToast(): PointsToastData | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => pending,
  );
}
