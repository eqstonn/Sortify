// Fake backend replies shared by the screen tests.

import type { ClassifyResult, ProfileOut } from "@/lib/api";

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
    ...overrides,
  };
}
