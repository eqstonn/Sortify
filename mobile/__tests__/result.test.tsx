// The result screen with the API and navigation faked.

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert, StyleSheet } from "react-native";

import Home from "@/app/(tabs)/index";
import Result from "@/app/result";
import { api, ApiError } from "@/lib/api";
import { lastScan } from "@/lib/lastScan";
import { clearPointsToast } from "@/lib/pointsToast";
import { binColors } from "@/theme";

import { fakeProfile, fakeResult } from "@/test-utils/fixtures";

jest.mock("@/lib/supabase", () => ({ getAccessToken: jest.fn(async () => "test-token") }));
jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    api: {
      confirmScan: jest.fn(),
      correctScan: jest.fn(),
      categories: jest.fn(),
      nextPickup: jest.fn(),
      health: jest.fn(),
      me: jest.fn(),
      discoverCurrent: jest.fn(async () => null),
    },
  };
});
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() },
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

const mockApi = api as jest.Mocked<typeof api>;
const { router } = jest.requireMock("expo-router");

beforeEach(() => {
  jest.clearAllMocks();
  clearPointsToast();
  mockApi.nextPickup.mockResolvedValue({
    pickup_date: "2026-10-27",
    days_away: 0,
    bins: ["blue_bin", "green_bin"],
    label: "Blue + green bin · Tue, Oct 27",
    holiday: null,
  });
  lastScan.set({ photoUri: "file:///photo.jpg", result: fakeResult() });
});

test("shows the item, a blue card for the blue bin, and the prep steps", async () => {
  await render(<Result />);

  expect(screen.getByText("Aluminum can")).toBeTruthy();
  expect(screen.getByText("Metal · 96% sure")).toBeTruthy();
  expect(screen.getByText("Recyclable")).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByTestId("bin-card").props.style).backgroundColor).toBe(binColors.blue_bin);
  expect(screen.getByText("Empty it and give it a quick rinse")).toBeTruthy();
  expect(screen.getByText("+15 pts")).toBeTruthy();
  expect(await screen.findByText("Next pickup Tue, Oct 27")).toBeTruthy();
});

test("a black bin item on a blue week says it goes out the week after", async () => {
  lastScan.set({ photoUri: "file:///photo.jpg", result: fakeResult({ bin: "black_bin", name: "Cardboard" }) });

  await render(<Result />);

  expect(await screen.findByText("Not Tue, Oct 27, the week after")).toBeTruthy();
});

test('"I recycled it" confirms the scan, goes Home and Home shows the points toast', async () => {
  mockApi.confirmScan.mockResolvedValue({
    scan_id: "s1",
    category_id: "aluminum_can",
    points_awarded: 25,
    total_points: 1265,
    notes: ["+15 bonus for your first aluminum can!"],
  });

  await render(<Result />);
  await fireEvent.press(screen.getByRole("button", { name: "I recycled it" }));

  expect(mockApi.confirmScan).toHaveBeenCalledWith("s1");
  expect(router.dismissTo).toHaveBeenCalledWith("/");

  mockApi.health.mockResolvedValue({ status: "ok" });
  mockApi.me.mockResolvedValue(fakeProfile({ total_points: 1265 }));
  await render(<Home />);

  expect(screen.getByText("+25 pts")).toBeTruthy();
  expect(screen.getByText("+15 bonus for your first aluminum can!")).toBeTruthy();
});

test("a failed confirm shows the backend's message and stays put", async () => {
  mockApi.confirmScan.mockRejectedValue(new ApiError(409, "You already confirmed this scan"));
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

  await render(<Result />);
  await fireEvent.press(screen.getByRole("button", { name: "I recycled it" }));

  expect(alert).toHaveBeenCalledWith("Couldn't save that", "You already confirmed this scan");
  expect(router.dismissTo).not.toHaveBeenCalled();
});

test('"Not right?" sends the picked category and shows the new bin', async () => {
  mockApi.categories.mockResolvedValue([
    { id: "glass_bottle", name: "Glass bottle", material: "glass", bin: "blue_bin", dropoff_type: null, points: 10, rarity: "common", kg_estimate: 0.3, tips: [], examples: [], verify: false },
    { id: "pizza_box", name: "Greasy pizza box", material: "paper", bin: "green_bin", dropoff_type: null, points: 10, rarity: "common", kg_estimate: 0.2, tips: [], examples: ["pizza"], verify: false },
  ]);
  mockApi.correctScan.mockResolvedValue(
    fakeResult({ category_id: "pizza_box", name: "Greasy pizza box", material: "paper", bin: "green_bin", points: 8, tips: [] }),
  );

  await render(<Result />);
  await fireEvent.press(screen.getByRole("button", { name: "Not right?" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Greasy pizza box" }));

  expect(mockApi.correctScan).toHaveBeenCalledWith("s1", { category_id: "pizza_box" });
  await waitFor(() => expect(screen.getByText("Green bin")).toBeTruthy());
  expect(StyleSheet.flatten(screen.getByTestId("bin-card").props.style).backgroundColor).toBe(binColors.green_bin);
  expect(screen.getByText("+8 pts")).toBeTruthy();
});

test('an "unsure" scan can\'t be confirmed until it is corrected', async () => {
  lastScan.set({
    photoUri: "file:///photo.jpg",
    result: fakeResult({ category_id: "unknown", name: "Something", bin: "unsure", recyclable: false, points: 0 }),
  });

  await render(<Result />);
  await fireEvent.press(screen.getByRole("button", { name: "I recycled it" }));

  expect(mockApi.confirmScan).not.toHaveBeenCalled();
  expect(screen.getByText('Tap "Not right?" and pick what it is')).toBeTruthy();
});

test("Skip goes back without confirming", async () => {
  await render(<Result />);
  await fireEvent.press(screen.getByRole("button", { name: "Skip" }));

  expect(router.back).toHaveBeenCalled();
  expect(mockApi.confirmScan).not.toHaveBeenCalled();
});
