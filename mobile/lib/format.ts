// Small text helpers shared by screens.

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
