// The sentence helpers in lib/format.ts and lib/wrapped.ts.

import { kgText, plural } from "@/lib/format";
import { materialLabel } from "@/lib/materials";
import {
  busiestDayText, comparedToAverage, introLine, monthName, rarityLine, shareMessage, withArticle, wrappedMonths,
} from "@/lib/wrapped";

import { fakeWrapped } from "@/test-utils/fixtures";

test("plural", () => {
  expect(plural(1, "day")).toBe("1 day");
  expect(plural(0, "day")).toBe("0 days");
  expect(plural(1240, "point")).toBe("1,240 points");
});

test("kgText rounds like a person would", () => {
  expect(kgText(0)).toBe("0 g");
  expect(kgText(0.45)).toBe("450 g");
  expect(kgText(4.41)).toBe("4.4 kg");
  expect(kgText(3)).toBe("3 kg");
  expect(kgText(12.6)).toBe("13 kg");
});

test("wrappedMonths tries this month then last month, across the new year", () => {
  expect(wrappedMonths(new Date(2026, 9, 28))).toEqual([{ year: 2026, month: 10 }, { year: 2026, month: 9 }]);
  expect(wrappedMonths(new Date(2027, 0, 3))).toEqual([{ year: 2027, month: 1 }, { year: 2026, month: 12 }]);
});

test("month names", () => {
  expect(monthName(1)).toBe("January");
  expect(monthName(12)).toBe("December");
});

test("intro line", () => {
  expect(introLine(fakeWrapped({ items: 1, points: 10, top_materials: fakeWrapped().top_materials.slice(0, 1) }))).toBe(
    "1 item. 1 material. 10 points.",
  );
});

test("compared to the average player", () => {
  expect(comparedToAverage(fakeWrapped({ kg: 9, average_kg: 4 }))).toMatch(/more than double/);
  expect(comparedToAverage(fakeWrapped({ kg: 5, average_kg: 4 }))).toBe("That's more than the average Sortify user sorted.");
  expect(comparedToAverage(fakeWrapped({ kg: 1, average_kg: 4 }))).toBe("Every item counts.");
  expect(comparedToAverage(fakeWrapped({ players: 1 }))).toBe(""); // only you: no comparison
});

test("a or an", () => {
  expect(withArticle("old laptop battery")).toBe("An old laptop battery");
  expect(withArticle("phone charger")).toBe("A phone charger");
});

test("rarity line only says 'Only' when it's actually rare", () => {
  expect(rarityLine(2)).toBe("Only 2% of Sortify users recycled one this month.");
  expect(rarityLine(67)).toBe("67% of Sortify users recycled one this month.");
});

test("busiest day", () => {
  expect(busiestDayText("sunday")).toBe("Sundays");
  expect(busiestDayText(null)).toBe("–");
});

test("share message leaves out the rank when there isn't one", () => {
  expect(shareMessage(fakeWrapped({ rank: null, items: 1, kg: 0.3 }))).toBe(
    "My October on Sortify: 1 item sorted, about 300 g kept out of landfill. ♻️",
  );
});

test("material labels", () => {
  expect(materialLabel("electronics")).toBe("E-waste");
  expect(materialLabel("plastic")).toBe("Plastic");
  expect(materialLabel("textiles")).toBe("Textiles");
});
