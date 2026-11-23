// The mockups' demo numbers, shown only when the backend can't be reached
// (no connection, server asleep), so the app still looks alive in a demo.
// Screens mark it clearly ("Offline: showing demo data") and keep retrying on focus.

import { ApiError, type DiscoverOut, type LeaderboardOut, type LeaderboardRange, type NextPickup, type ProfileOut } from "@/lib/api";

/** True when the request never reached a server (as opposed to the server saying no). */
export function isOffline(e: unknown): boolean {
  if (e instanceof ApiError) return e.status === 0;
  // Supabase's own sign-in call fails with a plain network error
  return e instanceof Error && /network|fetch|connection|timed? ?out/i.test(e.message);
}

export const demoProfile: ProfileOut = {
  id: "demo-me",
  name: "Easton",
  avatar: "",
  total_points: 1240,
  level: { number: 3, name: "Sapling", min_points: 800, next_name: "Young Tree", next_at: 1500, points_to_next: 260, progress: 440 / 700 },
  items_sorted: 86,
  kg_diverted: 9,
  items_this_week: 12,
  current_streak: 4,
  longest_streak: 11,
  rank: 8,
  breakdown: [
    { material: "plastic", count: 31, percent: 36 },
    { material: "paper", count: 24, percent: 28 },
    { material: "metal", count: 15, percent: 17 },
    { material: "glass", count: 9, percent: 10 },
    { material: "electronics", count: 7, percent: 8 },
  ],
  schedule: null,
  badges: [
    { id: "first_sort", name: "First sort", description: "Sort your first item", earned: true, earned_at: null },
    { id: "ewaste_hero", name: "E-waste hero", description: "Take 3 electronics or batteries to a drop-off", earned: true, earned_at: null },
    { id: "streak_7", name: "7-day streak", description: "Sort something 7 days in a row", earned: true, earned_at: null },
    { id: "glass_master", name: "Glass master", description: "Sort 10 glass bottles or jars", earned: false, earned_at: null },
  ],
};

/** Me's "Recycling since Oct 2026" in the mockup. */
export const demoSince = "Oct 2026";

export const demoPickup: NextPickup = {
  pickup_date: "2026-10-27",
  days_away: 2,
  bins: ["black_bin", "green_bin"],
  label: "Black + green bin · Tue, Oct 27",
  holiday: null,
};

export const demoDiscover: DiscoverOut = {
  week_of: "2026-10-19",
  ends_on: "2026-10-25",
  category_id: "greasy_pizza_box",
  item: "Pizza boxes",
  name: "Greasy pizza box",
  bin: "green_bin",
  bonus_points: 20,
  explainer: "Greasy ones go in the green bin",
  tips: ["Greasy parts go in the green bin", "Clean parts can go in the black bin"],
  found: false,
};

const DEMO_PLAYERS: [string, number, number][] = [
  ["Maya R.", 3480, 64],
  ["Jordan T.", 2910, 55],
  ["Priya S.", 2655, 50],
  ["Liam K.", 2120, 41],
  ["Ava L.", 1905, 37],
  ["Noah B.", 1610, 30],
  ["Chloe M.", 1395, 27],
];

export function demoLeaderboard(range: LeaderboardRange): LeaderboardOut {
  const entries = DEMO_PLAYERS.map(([name, points, items], i) => ({
    rank: i + 1,
    user_id: `demo-${i + 1}`,
    name,
    avatar: "",
    points,
    items,
    is_me: false,
  }));
  const me = { rank: 8, user_id: "demo-me", name: "Easton", avatar: "", points: 1240, items: 22, is_me: true };
  return { range, entries: [...entries, me], me };
}
