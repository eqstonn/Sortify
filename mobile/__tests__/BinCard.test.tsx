import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import BinCard from "@/components/BinCard";
import type { Bin } from "@/lib/api";
import { binColors } from "@/theme";

const cases: [Bin, string][] = [
  ["blue_bin", "Blue bin"],
  ["black_bin", "Black bin"],
  ["green_bin", "Green bin"],
  ["garbage", "Garbage"],
  ["dropoff", "Drop-off"],
  ["unsure", "Not sure"],
];

test.each(cases)("%s is drawn in its own colour as %s", async (bin, label) => {
  await render(<BinCard bin={bin} />);

  expect(screen.getByText(label)).toBeTruthy();
  const style = StyleSheet.flatten(screen.getByTestId("bin-card").props.style);
  expect(style.backgroundColor).toBe(binColors[bin]);
});

test("every bin has a different colour", () => {
  const colours = Object.values(binColors);
  expect(new Set(colours).size).toBe(colours.length);
});

test("shows the pickup line when there is one", async () => {
  await render(<BinCard bin="blue_bin" detail="Next pickup Tue, Oct 27" />);

  expect(screen.getByText("PUT IT IN THE")).toBeTruthy();
  expect(screen.getByText("Next pickup Tue, Oct 27")).toBeTruthy();
});
