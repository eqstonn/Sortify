// The words on the Sortify Wrapped cards, worked out from GET /wrapped.
// The numbers all come from the backend; this only turns them into sentences.

import type { WrappedOut } from "@/lib/api";
import { kgText, plural } from "@/lib/format";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** 10 -> "October" */
export function monthName(month: number): string {
  return MONTHS[month - 1];
}

/** Which months to try: this one, then last month (early in a month this one is still empty). */
export function wrappedMonths(today: Date): { year: number; month: number }[] {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  return [{ year, month }, month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }];
}

/** Intro card: "86 items. 5 materials. 1,240 points." */
export function introLine(w: WrappedOut): string {
  return `${plural(w.items, "item")}. ${plural(w.top_materials.length, "material")}. ${plural(w.points, "point")}.`;
}

/** Total card, after "about 9 kg kept out of landfill." */
export function comparedToAverage(w: WrappedOut): string {
  if (w.players < 2 || w.average_kg <= 0 || w.kg <= 0) return "";
  const ratio = w.kg / w.average_kg;
  if (ratio >= 2) return "That's more than double what the average Sortify user sorted.";
  if (ratio >= 1.2) return "That's more than the average Sortify user sorted.";
  return "Every item counts.";
}

/** "old laptop battery" -> "An old laptop battery" */
export function withArticle(item: string): string {
  return `${/^[aeiou]/i.test(item) ? "An" : "A"} ${item}`;
}

/** Rarest find card: how many other players found one. */
export function rarityLine(percent: number): string {
  return `${percent < 50 ? "Only " : ""}${percent}% of Sortify users recycled one this month.`;
}

/** "sunday" -> "Sundays" */
export function busiestDayText(day: string | null): string {
  return day ? `${day.charAt(0).toUpperCase()}${day.slice(1)}s` : "–";
}

export function shareMessage(w: WrappedOut): string {
  const rank = w.rank ? `, #${w.rank} in Ottawa` : "";
  return (
    `My ${monthName(w.month)} on Sortify: ${plural(w.items, "item")} sorted, ` +
    `about ${kgText(w.kg)} kept out of landfill${rank}. ♻️`
  );
}
