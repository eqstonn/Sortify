// The Home tab with the API faked.

import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import Storage from "expo-sqlite/kv-store";

import Home from "@/app/(tabs)/index";
import { api, ApiError } from "@/lib/api";
import { TRICKY, trickyThisWeek } from "@/lib/discover";
import { greeting, levelHint } from "@/lib/format";
import { plantArt, stageFor, STAGES } from "@/lib/plant";

import { fakeDiscover, fakePickup, fakeProfile } from "@/test-utils/fixtures";

const mockNavigate = jest.fn();
jest.mock("@/lib/supabase", () => ({ getAccessToken: jest.fn(async () => "test-token") }));
jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    api: { me: jest.fn(), nextPickup: jest.fn(), setSchedule: jest.fn(), discoverCurrent: jest.fn(), categories: jest.fn() },
  };
});
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
    router: { navigate: (path: string) => mockNavigate(path) },
  };
});

const mockApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
  (Storage as unknown as { clearSync: () => void }).clearSync();
  mockApi.me.mockResolvedValue(fakeProfile());
  mockApi.nextPickup.mockResolvedValue(fakePickup());
  mockApi.discoverCurrent.mockResolvedValue(fakeDiscover());
  mockApi.categories.mockResolvedValue([
    {
      id: "greasy_pizza_box", name: "Greasy pizza box", material: "organic", bin: "green_bin", dropoff_type: null,
      points: 10, rarity: "common", kg_estimate: 0.2, tips: ["Greasy parts go in the green bin"], examples: [], verify: false,
    },
  ]);
});

test("shows the greeting, points, level pill, level bar and the three tiles", async () => {
  jest.spyOn(Date.prototype, "getHours").mockReturnValue(20);
  await render(<Home />);

  expect(await screen.findByText("Good evening, Sam")).toBeTruthy();
  expect(screen.getByText("Your garden is growing")).toBeTruthy();
  expect(screen.getByTestId("points")).toHaveTextContent("1,240");
  expect(screen.getByText("points")).toBeTruthy();
  expect(screen.getByText("Level 3 · Sapling")).toBeTruthy();
  expect(screen.getByRole("progressbar")).toHaveAccessibilityValue({ now: 63 });
  expect(screen.getByText("260 points until your plant becomes a Young Tree")).toBeTruthy();
  expect(screen.getByLabelText("5 items this week")).toBeTruthy();
  expect(screen.getByLabelText("2 days streak")).toBeTruthy();
  expect(screen.getByLabelText("#12 in Ottawa")).toBeTruthy();
  jest.restoreAllMocks();
});

test("a new player with no points isn't ranked yet", async () => {
  mockApi.me.mockResolvedValue(fakeProfile({ rank: null, total_points: 0 }));
  await render(<Home />);

  expect(await screen.findByLabelText("– not ranked yet")).toBeTruthy();
});

test("the plant is the art for your level", async () => {
  mockApi.me.mockResolvedValue(fakeProfile({ level: { ...fakeProfile().level, number: 2, name: "Seedling" } }));
  await render(<Home />);

  const plant = await screen.findByTestId("plant");
  expect(plant.props.accessibilityLabel).toBe("Your plant: level 2, Seedling");
});

test("each level has its own plant stage, and anything past the top uses the top stage", () => {
  expect(STAGES).toBe(4);
  const files = [1, 2, 3, 4].map((level) => plantArt(stageFor(level)).file);
  expect(files).toEqual(["stage-1.png", "stage-2.png", "stage-3.png", "stage-4.png"]);
  expect(stageFor(9)).toBe(4);
  expect(stageFor(0)).toBe(1);
});

test("the avatar is the default person until there's a photo, and opens Me", async () => {
  await render(<Home />);

  await screen.findByTestId("points");
  expect(screen.getByTestId("avatar-default")).toBeTruthy(); // the fixture's avatar is an old emoji id
  await fireEvent.press(screen.getByRole("button", { name: "Your profile" }));
  expect(mockNavigate).toHaveBeenCalledWith("/me");
});

test("shows the Up next card from GET /schedule/next", async () => {
  await render(<Home />);

  expect(await screen.findByText("UP NEXT")).toBeTruthy();
  expect(screen.getByText("Black + green bin · Tue, Nov 3")).toBeTruthy();
});

test("with no pickup day, the card asks for one and saving it shows the next pickup", async () => {
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

test("a holiday shift is called out on the card", async () => {
  mockApi.nextPickup.mockResolvedValue(fakePickup({ holiday: "Remembrance Day" }));

  await render(<Home />);

  expect(await screen.findByText("Moved a day for Remembrance Day")).toBeTruthy();
});

test("Discover weekly: this week's item first with its bonus, then two tricky items", async () => {
  await render(<Home />);

  const section = await screen.findByTestId("discover");
  expect(within(section).getByText("Discover weekly")).toBeTruthy();
  expect(await within(section).findByText("Greasy pizza box")).toBeTruthy();
  expect(within(section).getByText("+20")).toBeTruthy();
  const others = trickyThisWeek(2, "greasy_pizza_box");
  for (const t of others) expect(within(section).getByText(t.title)).toBeTruthy();
});

test("once found, this week's item shows a tick instead of the bonus", async () => {
  mockApi.discoverCurrent.mockResolvedValue(fakeDiscover({ found: true }));
  await render(<Home />);

  await screen.findByText("Greasy pizza box");
  expect(screen.queryByText("+20")).toBeNull();
  expect(screen.getByTestId("icon-Check")).toBeTruthy();
});

test("tapping a Discover row shows its bin and tips from GET /categories", async () => {
  await render(<Home />);

  await fireEvent.press(await screen.findByTestId("discover-weekly"));

  expect(await screen.findByTestId("bin-card")).toBeTruthy();
  // The tip shows in the sheet as well as on the row
  expect(screen.getAllByText("Greasy parts go in the green bin")).toHaveLength(2);
  expect(screen.getByText(/\+20 points when you sort one/)).toBeTruthy();
});

test("See all lists every tricky item", async () => {
  await render(<Home />);

  await fireEvent.press(await screen.findByRole("button", { name: "See all" }));
  expect(screen.getByText("Tricky items")).toBeTruthy();
  for (const t of TRICKY) expect(screen.getAllByText(t.title).length).toBeGreaterThan(0);
});

test("Home still works when Discover can't load: three tricky items instead", async () => {
  mockApi.discoverCurrent.mockRejectedValue(new ApiError(500, "Something went wrong"));

  await render(<Home />);

  expect(await screen.findByTestId("points")).toBeTruthy();
  expect(screen.queryByTestId("discover-weekly")).toBeNull();
  for (const t of trickyThisWeek(3)) expect(screen.getByText(t.title)).toBeTruthy();
});

test("the tricky items change from week to week", () => {
  const week1 = trickyThisWeek(2, undefined, new Date(2026, 10, 2)).map((t) => t.categoryId);
  const week2 = trickyThisWeek(2, undefined, new Date(2026, 10, 9)).map((t) => t.categoryId);
  expect(week1).not.toEqual(week2);
  expect(trickyThisWeek(2, "battery").some((t) => t.categoryId === "battery")).toBe(false);
});

test("a spinner shows while loading", async () => {
  mockApi.me.mockReturnValue(new Promise(() => {}));

  await render(<Home />);

  expect(screen.getByTestId("loading")).toBeTruthy();
});

test("when the backend can't be reached, the mockup's demo numbers show, marked as offline", async () => {
  mockApi.me.mockRejectedValue(new ApiError(0, "Can't reach Sortify. Check your connection and try again."));
  mockApi.discoverCurrent.mockRejectedValue(new ApiError(0, "Can't reach Sortify."));

  await render(<Home />);

  expect(await screen.findByTestId("offline-note")).toBeTruthy();
  expect(screen.getByTestId("points")).toHaveTextContent("1,240");
  expect(screen.getByText("Level 3 · Sapling")).toBeTruthy();
  expect(screen.getByText("260 points until your plant becomes a Young Tree")).toBeTruthy();

  // Back online: Try again loads the real profile
  mockApi.me.mockResolvedValue(fakeProfile({ total_points: 1255 }));
  await fireEvent.press(screen.getByText("Try again"));
  expect(await screen.findByText("1,255")).toBeTruthy();
  expect(screen.queryByTestId("offline-note")).toBeNull();
});

test("any other failure shows the error, and Try again reloads", async () => {
  mockApi.me.mockRejectedValueOnce(new ApiError(500, "Something went wrong (error 500). Try again."));

  await render(<Home />);
  expect(await screen.findByText("Couldn't load your garden")).toBeTruthy();

  await fireEvent.press(screen.getByText("Try again"));

  expect(await screen.findByTestId("points")).toHaveTextContent("1,240");
});

test("pull to refresh loads fresh points", async () => {
  await render(<Home />);
  await screen.findByTestId("points");

  mockApi.me.mockResolvedValue(fakeProfile({ total_points: 1255 }));
  await act(async () => {
    await screen.getByTestId("home-scroll").props.refreshControl.props.onRefresh();
  });

  expect(screen.getByText("1,255")).toBeTruthy();
});

test("greeting follows the time of day, and the top level says Max level", () => {
  expect(greeting(8)).toBe("Good morning");
  expect(greeting(14)).toBe("Good afternoon");
  expect(greeting(20)).toBe("Good evening");
  const top = { ...fakeProfile().level, number: 4, name: "Young Tree", next_name: null, next_at: null, points_to_next: 0, progress: 1 };
  expect(levelHint(top)).toMatch(/^Max level/);
});
