// "Up 3 spots this week" on Board's You row.
//
// The backend doesn't keep past ranks, so the phone remembers the first rank it
// saw this week (This week) or today (All time) and compares against that.
// Before there's anything to compare with, there's no movement (null).

import type { LeaderboardRange } from "@/lib/api";
import { kvGet, kvSet } from "@/lib/kv";

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function mondayKey(d: Date): string {
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dayKey(monday);
}

/** Spots moved since the start of the period: positive = up, negative = down, null = nothing to compare yet. */
export function rankMovement(range: LeaderboardRange, rank: number, today = new Date()): number | null {
  const period = range === "week" ? mondayKey(today) : dayKey(today);
  const key = `board.baseline.${range}`;
  let saved: { period?: string; rank?: number } | null = null;
  try {
    saved = JSON.parse(kvGet(key) ?? "null");
  } catch {
    saved = null;
  }
  if (!saved || saved.period !== period || typeof saved.rank !== "number") {
    kvSet(key, JSON.stringify({ period, rank }));
    return null;
  }
  return saved.rank - rank;
}

/** The You row's second line. */
export function movementText(range: LeaderboardRange, moved: number | null): string | null {
  if (moved === null) return null;
  const when = range === "week" ? "this week" : "today";
  if (moved === 0) return `Same spot as earlier ${when}`;
  const n = Math.abs(moved);
  return `${moved > 0 ? "Up" : "Down"} ${n} ${n === 1 ? "spot" : "spots"} ${when}`;
}
