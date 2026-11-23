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

// ---------- the story (components/WrappedStory.tsx) ----------

export type CardId = "intro" | "total" | "material" | "rarest" | "kg" | "rank" | "summary";

/** The cards to show, in order. Material and rarest find only when there's something to say. */
export function storyCards(w: WrappedOut): CardId[] {
  const cards: CardId[] = ["intro", "total"];
  if (w.top_materials.length > 0) cards.push("material");
  if (w.rarest_find) cards.push("rarest");
  cards.push("kg", "rank", "summary");
  return cards;
}

// Rough weights, for a picture of how much that is
const THINGS = [
  { kg: 5, one: "watermelon", many: "watermelons" },
  { kg: 1, one: "pineapple", many: "pineapples" },
  { kg: 0.2, one: "apple", many: "apples" },
];

/** 9.2 -> "That's about 2 watermelons", 0.15 -> "That's about an apple" */
export function kgComparison(kg: number): string {
  const thing = THINGS.find((t) => kg >= t.kg * 0.75) ?? THINGS[THINGS.length - 1];
  const count = Math.max(1, Math.round(kg / thing.kg));
  return count === 1 ? `That's about ${withArticle(thing.one).toLowerCase()}` : `That's about ${count} ${thing.many}`;
}

/** The top material's share of everything sorted: 31 of 86 -> 36 */
export function topShare(w: WrappedOut): number {
  const top = w.top_materials[0];
  return top && w.items > 0 ? Math.round((100 * top.count) / w.items) : 0;
}
