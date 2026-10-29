// Small text helpers shared by screens.

import type { LeaderboardRange, Level } from "@/lib/api";

/** plural(1, "item") -> "1 item", plural(3, "day") -> "3 days" */
export function plural(n: number, word: string): string {
  return `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
}

/** 0.45 -> "450 g", 4.41 -> "4.4 kg", 12.6 -> "13 kg" */
export function kgText(kg: number): string {
  if (kg < 1) return `${Math.round(kg * 1000)} g`;
  if (kg < 10) return `${Number(kg.toFixed(1))} kg`;
  return `${Math.round(kg)} kg`;
}

/** Home's "Good evening, Sam" for the phone's hour (0 to 23) */
export function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** The line under Home's level bar */
export function levelHint(level: Level): string {
  if (!level.next_name) return "Your plant is fully grown. Keep sorting!";
  return `${plural(level.points_to_next, "point")} until your plant becomes a ${level.next_name}`;
}

/** Board's "Ottawa · week of Oct 26" (weeks start Monday, like the backend) */
export function boardSubtitle(range: LeaderboardRange, today = new Date()): string {
  if (range === "all") return "Ottawa · all time";
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return `Ottawa · week of ${monday.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}`;
}
