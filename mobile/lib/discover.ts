// Home's "Discover weekly" rows. The first row is this week's bonus item from
// GET /discover/current. The rest are tricky items people often get wrong,
// rotating every week. Each row's bin and tips come from GET /categories
// (data/categories.json): these short lines are just the headline.

import { BatteryPlus, Box, Coffee, CupSoda, Leaf, Lightbulb, type LucideIcon, Milk, Package, Pizza, ShoppingBag, Sparkles, SprayCan } from "lucide-react-native";

export type TrickyItem = { categoryId: string; title: string; line: string; icon: LucideIcon };

export const TRICKY: TrickyItem[] = [
  { categoryId: "greasy_pizza_box", title: "Pizza boxes", line: "Greasy ones go in the green bin", icon: Pizza },
  { categoryId: "glass_bottle_jar", title: "Glass jars", line: "Rinse them out, then blue bin", icon: Milk },
  { categoryId: "battery", title: "Batteries", line: "Never in a bin — take to a drop-off", icon: BatteryPlus },
  { categoryId: "coffee_cup", title: "Coffee cups", line: "Cup in the garbage, lid in the blue bin", icon: Coffee },
  { categoryId: "plastic_bag_film", title: "Plastic bags", line: "Clean and dry ones go in the black bin", icon: ShoppingBag },
  { categoryId: "chip_bag", title: "Chip bags", line: "Not recyclable — they go in the garbage", icon: Package },
  { categoryId: "polystyrene_foam", title: "Styrofoam", line: "Not taken at the curb — garbage", icon: Box },
  { categoryId: "aerosol_can", title: "Aerosol cans", line: "Only when empty, then blue bin", icon: SprayCan },
  { categoryId: "light_bulb", title: "CFL bulbs", line: "Contains mercury — drop-off only", icon: Lightbulb },
  { categoryId: "coffee_grounds_tea", title: "Coffee grounds", line: "Grounds and paper filters: green bin", icon: Leaf },
  { categoryId: "drink_box", title: "Drink boxes", line: "Empty it, then blue bin", icon: CupSoda },
];

/** The row icon for a category; anything we don't have a picture for gets sparkles. */
export function iconFor(categoryId: string): LucideIcon {
  return TRICKY.find((t) => t.categoryId === categoryId)?.icon ?? Sparkles;
}

const FIRST_MONDAY = Date.UTC(2026, 0, 5); // weeks are counted from here; any Monday works

/** This week's tricky items: `count` of them, never the weekly bonus item, a different set each week. */
export function trickyThisWeek(count: number, skipCategoryId?: string, today = new Date()): TrickyItem[] {
  const pool = TRICKY.filter((t) => t.categoryId !== skipCategoryId);
  const days = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - FIRST_MONDAY) / 86_400_000);
  const week = Math.floor(days / 7);
  const start = (((week * count) % pool.length) + pool.length) % pool.length;
  return Array.from({ length: Math.min(count, pool.length) }, (_, i) => pool[(start + i) % pool.length]);
}
