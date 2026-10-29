// The Home tab with the API faked.

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import Home from "@/app/(tabs)/index";
import PlantHero from "@/components/PlantHero";
import { api, ApiError } from "@/lib/api";
import { greeting, levelHint } from "@/lib/format";
import { binColors } from "@/theme";

import { fakeDiscover, fakePickup, fakeProfile } from "@/test-utils/fixtures";

jest.mock("@/lib/supabase", () => ({ getAccessToken: jest.fn(async () => "test-token") }));
jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    api: { me: jest.fn(), nextPickup: jest.fn(), setSchedule: jest.fn(), discoverCurrent: jest.fn() },
  };
});
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return { useFocusEffect: (effect: () => void) => useEffect(effect, [effect]) };
});

const mockApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.me.mockResolvedValue(fakeProfile());
  mockApi.nextPickup.mockResolvedValue(fakePickup());
  mockApi.discoverCurrent.mockResolvedValue(fakeDiscover());
});

test("shows the greeting, points, level bar and the three tiles", async () => {
  await render(<Home />);

  expect(await screen.findByText(/, Sam$/)).toBeTruthy();
  expect(screen.getByText("Your garden is growing")).toBeTruthy();
  expect(screen.getByText("1,240")).toBeTruthy();
  expect(screen.getByText("points · Level 3 Sapling")).toBeTruthy();
  expect(screen.getByText("1,260 points until your plant becomes a Young Tree")).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByTestId("level-bar").props.style).width).toBe("16%");
  expect(screen.getByLabelText("Your plant: level 3 Sapling")).toBeTruthy();

  expect(screen.getByText("5")).toBeTruthy();
  expect(screen.getByText("items this week")).toBeTruthy();
  expect(screen.getByText("2 days")).toBeTruthy();
  expect(screen.getByText("#12")).toBeTruthy();
  expect(screen.getByText("in Ottawa")).toBeTruthy();
});

test("a new player with no points isn't ranked yet", async () => {
  mockApi.me.mockResolvedValue(fakeProfile({ rank: null, current_streak: 1 }));

  await render(<Home />);

  expect(await screen.findByText("not ranked yet")).toBeTruthy();
  expect(screen.getByText("1 day")).toBeTruthy();
});

test("the plant grows: a higher level has more leaves, a Seed has none", async () => {
  await render(<PlantHero level={2} name="Sprout" />);
  const small = screen.getAllByTestId("plant-leaf").length;

  await screen.rerender(<PlantHero level={6} name="Tree" />);
  const big = screen.getAllByTestId("plant-leaf").length;
  expect(big).toBeGreaterThan(small);

  await screen.rerender(<PlantHero level={1} name="Seed" />);
  expect(screen.queryAllByTestId("plant-leaf")).toHaveLength(0);
});

test("shows the Up next banner from GET /schedule/next", async () => {
  await render(<Home />);

  expect(await screen.findByText("UP NEXT")).toBeTruthy();
  expect(screen.getByText("Black + green bin · Tue, Nov 3")).toBeTruthy();
});

test("with no pickup day, the banner asks for one and saving it shows the next pickup", async () => {
  mockApi.nextPickup.mockResolvedValue(null);
  mockApi.setSchedule.mockResolvedValue(fakePickup({ label: "Blue + green bin · Thu, Oct 29" }));

  await render(<Home />);
  await fireEvent.press(await screen.findByText("Set your pickup day"));

  await fireEvent.press(screen.getByText("Thu"));
  await fireEvent.press(screen.getByText("Blue bin"));
  await fireEvent.press(screen.getByText("Save"));

  expect(mockApi.setSchedule).toHaveBeenCalledWith({ pickup_day: "thursday", this_week: "blue_bin" });
  expect(await screen.findByText("Blue + green bin · Thu, Oct 29")).toBeTruthy();
  expect(screen.queryByText("Set your pickup day")).toBeNull();
});

test("a holiday shift is called out on the banner", async () => {
  mockApi.nextPickup.mockResolvedValue(fakePickup({ holiday: "Remembrance Day" }));

  await render(<Home />);

  expect(await screen.findByText("Moved a day for Remembrance Day")).toBeTruthy();
});

test("shows this week's Discover item, its bin and the bonus", async () => {
  await render(<Home />);

  expect(await screen.findByText("Greasy pizza box")).toBeTruthy();
  expect(screen.getByText("DISCOVER WEEKLY")).toBeTruthy();
  expect(screen.getByText("+20 pts")).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByTestId("discover-bin").props.style).backgroundColor).toBe(binColors.green_bin);
});

test("once found, the Discover bonus shows as collected", async () => {
  mockApi.discoverCurrent.mockResolvedValue(fakeDiscover({ found: true }));

  await render(<Home />);

  expect(await screen.findByText("Found ✓")).toBeTruthy();
  expect(screen.queryByText("+20 pts")).toBeNull();
});

test("Home still works when Discover can't load", async () => {
  mockApi.discoverCurrent.mockRejectedValue(new ApiError(500, "Something went wrong"));

  await render(<Home />);

  expect(await screen.findByText("1,240")).toBeTruthy();
  expect(screen.queryByTestId("discover-card")).toBeNull();
});

test("a spinner shows while loading", async () => {
  mockApi.me.mockReturnValue(new Promise(() => {}));

  await render(<Home />);

  expect(screen.getByTestId("loading")).toBeTruthy();
});

test("a failed load shows the error, and Try again reloads", async () => {
  mockApi.me.mockRejectedValueOnce(new ApiError(0, "Can't reach Sortify. Check your connection and try again."));

  await render(<Home />);
  expect(await screen.findByText("Couldn't load your garden")).toBeTruthy();
  expect(screen.getByText("Can't reach Sortify. Check your connection and try again.")).toBeTruthy();

  await fireEvent.press(screen.getByText("Try again"));

  expect(await screen.findByText("1,240")).toBeTruthy();
});

test("pull to refresh loads fresh points", async () => {
  await render(<Home />);
  await screen.findByText("1,240");

  mockApi.me.mockResolvedValue(fakeProfile({ total_points: 1255 }));
  await act(async () => {
    await screen.getByTestId("home-scroll").props.refreshControl.props.onRefresh();
  });

  expect(screen.getByText("1,255")).toBeTruthy();
});

test("greeting follows the time of day, and the top level has no next level", () => {
  expect(greeting(8)).toBe("Good morning");
  expect(greeting(14)).toBe("Good afternoon");
  expect(greeting(20)).toBe("Good evening");
  const top = { ...fakeProfile().level, number: 8, name: "Forest", next_name: null, next_at: null, points_to_next: 0, progress: 1 };
  expect(levelHint(top)).toBe("Your plant is fully grown. Keep sorting!");
});
