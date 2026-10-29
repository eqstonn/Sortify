// Fake backend replies shared by the screen tests.

import type { BadgeOut, ClassifyResult, DiscoverOut, ProfileOut, WrappedOut } from "@/lib/api";

export function fakeResult(overrides: Partial<ClassifyResult> = {}): ClassifyResult {
  return {
    category_id: "aluminum_can",
    name: "Aluminum can",
    material: "metal",
    recyclable: true,
    bin: "blue_bin",
    dropoff_type: null,
    points: 15,
    tips: ["Empty it and give it a quick rinse", "Put it in loose, not inside a bag"],
    item: "Coke can",
    confidence: 0.96,
    scan_id: "s1",
    nearest_dropoff: null,
    ...overrides,
  };
}

export function fakeProfile(overrides: Partial<ProfileOut> = {}): ProfileOut {
  return {
    id: "u1",
    name: "Sam",
    avatar: "fox",
    total_points: 1240,
    level: { number: 3, name: "Sapling", min_points: 1000, next_name: "Young Tree", next_at: 2500, points_to_next: 1260, progress: 0.16 },
    items_sorted: 42,
    kg_diverted: 3.2,
    items_this_week: 5,
    current_streak: 2,
    longest_streak: 6,
    rank: 12,
    breakdown: [],
    schedule: null,
    badges: fakeBadges(["first_sort"]),
    ...overrides,
  };
}

/** The four badges from app/services/badges.py, with the given ids earned (earned ones first, like GET /me). */
export function fakeBadges(earned: string[]): BadgeOut[] {
  const all = [
    { id: "first_sort", name: "First sort", description: "Sort your first item" },
    { id: "ewaste_hero", name: "E-waste hero", description: "Take 3 electronics or batteries to a drop-off" },
    { id: "streak_7", name: "7-day streak", description: "Sort something 7 days in a row" },
    { id: "glass_master", name: "Glass master", description: "Sort 10 glass bottles or jars" },
  ].map((b) => ({ ...b, earned: earned.includes(b.id), earned_at: earned.includes(b.id) ? "2026-10-04T16:00:00Z" : null }));
  return [...all.filter((b) => b.earned), ...all.filter((b) => !b.earned)];
}

/** October from the Wrapped mockups (docs/mockups/06-10). */
export function fakeWrapped(overrides: Partial<WrappedOut> = {}): WrappedOut {
  return {
    year: 2026,
    month: 10,
    items: 86,
    kg: 9.2,
    average_kg: 4.1,
    points: 1240,
    top_materials: [
      { material: "plastic", count: 31, top_items: ["Plastic bottle", "Plastic tub or container"] },
      { material: "paper", count: 24, top_items: ["Cardboard box"] },
      { material: "metal", count: 15, top_items: ["Aluminum can"] },
      { material: "glass", count: 9, top_items: ["Glass bottle or jar"] },
      { material: "electronics", count: 7, top_items: ["Electronics"] },
    ],
    rarest_find: {
      category_id: "battery",
      name: "Battery",
      item: "old laptop battery",
      material: "hazardous",
      bin: "dropoff",
      rarity: "rare",
      percent_of_players: 2,
    },
    rank: 8,
    players: 120,
    top_recycler: { user_id: "u9", name: "Maya R.", avatar: "fox", points: 3480, is_me: false },
    busiest_day: "sunday",
    longest_streak: 11,
    ...overrides,
  };
}

/** An empty month: what GET /wrapped returns before you've sorted anything. */
export function emptyWrapped(year: number, month: number): WrappedOut {
  return fakeWrapped({
    year, month, items: 0, kg: 0, average_kg: 0, points: 0, top_materials: [], rarest_find: null,
    rank: null, players: 0, top_recycler: null, busiest_day: null, longest_streak: 0,
  });
}

export function fakeDiscover(overrides: Partial<DiscoverOut> = {}): DiscoverOut {
  return {
    week_of: "2026-10-26",
    ends_on: "2026-11-01",
    category_id: "greasy_pizza_box",
    item: "Greasy pizza box",
    name: "Greasy pizza box",
    bin: "green_bin",
    bonus_points: 20,
    explainer: "Grease ruins paper recycling, so the greasy parts go in the green bin, not the black bin.",
    tips: ["Greasy parts go in the green bin"],
    found: false,
    ...overrides,
  };
}
