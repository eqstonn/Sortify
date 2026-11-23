// The Board tab with the API faked.

import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import Storage from "expo-sqlite/kv-store";

import Board from "@/app/(tabs)/board";
import { api, ApiError } from "@/lib/api";
import { boardSubtitle } from "@/lib/format";
import { movementText, rankMovement } from "@/lib/rankMovement";

import { fakeEntry, fakeLeaderboard } from "@/test-utils/fixtures";

jest.mock("@/lib/supabase", () => ({ getAccessToken: jest.fn(async () => "test-token") }));
jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return { ...actual, api: { leaderboard: jest.fn() } };
});
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return { useFocusEffect: (effect: () => void) => useEffect(effect, [effect]) };
});

const mockApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
  (Storage as unknown as { clearSync: () => void }).clearSync();
  mockApi.leaderboard.mockImplementation(async (range = "week") => fakeLeaderboard({ range }));
});

test("the top 3 are pots on the podium, #2 #1 #3 left to right, with a crown on #1", async () => {
  await render(<Board />);

  const podium = await screen.findByTestId("podium");
  expect(mockApi.leaderboard).toHaveBeenCalledWith("week");
  expect(within(podium).getByLabelText("Place 1: Maya R., 3900 points")).toBeTruthy();
  const places = within(podium)
    .getAllByLabelText(/^Place/)
    .map((el) => el.props.accessibilityLabel.split(":")[0]);
  expect(places).toEqual(["Place 2", "Place 1", "Place 3"]);
  expect(within(podium).getByTestId("crown")).toBeTruthy();
  expect(within(podium).getByText("3,900 pts")).toBeTruthy();
});

test("the rest are rows below with items sorted", async () => {
  await render(<Board />);

  expect(await screen.findByText("Liam K.")).toBeTruthy();
  expect(screen.getByText("46 items sorted")).toBeTruthy();
  expect(screen.getByText("Chloe M.")).toBeTruthy();
  expect(screen.getAllByText("Maya R.")).toHaveLength(1); // on the podium, not in the list too
});

test("your row is pinned at the bottom in green with your rank and points", async () => {
  await render(<Board />);

  const you = await screen.findByTestId("you-row");
  expect(within(you).getByText("You")).toBeTruthy();
  expect(within(you).getByText("8")).toBeTruthy();
  expect(within(you).getByText("1,240")).toBeTruthy();
  expect(within(you).getByText("22 items sorted")).toBeTruthy(); // first visit: nothing to compare yet
  expect(screen.getByTestId("my-row")).toBeTruthy(); // and in the list
});

test("climbing since your first visit this week shows on your row", async () => {
  await render(<Board />);
  await screen.findByTestId("you-row");

  // Later this week you're 5th
  const me = fakeEntry(5, "Sam", { user_id: "u1", is_me: true, points: 1900 });
  mockApi.leaderboard.mockResolvedValue(fakeLeaderboard({ me, entries: [fakeEntry(1, "Maya R."), me] }));
  await act(async () => {
    await screen.getByTestId("board-scroll").props.refreshControl.props.onRefresh();
  });

  expect(within(screen.getByTestId("you-row")).getByText("Up 3 spots this week")).toBeTruthy();
  expect(within(screen.getByTestId("you-row")).getByTestId("icon-ArrowUp")).toBeTruthy();
});

test("outside the top 20 you still get your row at the bottom", async () => {
  const me = fakeEntry(35, "Sam", { is_me: true, points: 120 });
  mockApi.leaderboard.mockResolvedValue(
    fakeLeaderboard({ entries: Array.from({ length: 20 }, (_, i) => fakeEntry(i + 1, `P${i + 1}`)), me }),
  );

  await render(<Board />);

  const you = await screen.findByTestId("you-row");
  expect(within(you).getByText("35")).toBeTruthy();
  expect(within(you).getByText("Keep sorting to reach the top 20")).toBeTruthy();
});

test("before you score, your row says you're not ranked", async () => {
  mockApi.leaderboard.mockResolvedValue(fakeLeaderboard({ me: null, entries: [fakeEntry(1, "Maya R.")] }));

  await render(<Board />);

  const you = await screen.findByTestId("you-row");
  expect(within(you).getByText("Sort an item to get ranked!")).toBeTruthy();
  expect(within(you).getByText("–")).toBeTruthy();
});

test("All time loads the all-time board", async () => {
  mockApi.leaderboard.mockImplementation(async (range = "week") =>
    fakeLeaderboard({ range, entries: [fakeEntry(1, range === "all" ? "Old Timer" : "Maya R.")], me: null }),
  );

  await render(<Board />);
  await screen.findByText("Maya R.");

  await fireEvent.press(screen.getByText("All time"));

  expect(mockApi.leaderboard).toHaveBeenLastCalledWith("all");
  expect(await screen.findByText("Old Timer")).toBeTruthy();
  expect(screen.getByText("Ottawa · all time")).toBeTruthy();
});

test("Friends says it's coming soon, without loading anything or showing your row", async () => {
  await render(<Board />);
  await screen.findByTestId("podium");

  await fireEvent.press(screen.getByText("Friends"));

  expect(screen.getByTestId("friends-soon")).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Friends" })).toBeSelected();
  expect(screen.queryByTestId("podium")).toBeNull();
  expect(screen.queryByTestId("you-row")).toBeNull();
  expect(mockApi.leaderboard).toHaveBeenCalledTimes(1);

  // Back to This week: the board is still there
  await fireEvent.press(screen.getByText("This week"));
  expect(screen.getByTestId("podium")).toBeTruthy();
});

test("an empty board invites you to take #1", async () => {
  mockApi.leaderboard.mockResolvedValue(fakeLeaderboard({ entries: [], me: null }));

  await render(<Board />);

  expect(await screen.findByText("No one’s on the board yet")).toBeTruthy();
  expect(screen.queryByTestId("podium")).toBeNull();
});

test("without migration 004, rows just leave out the item count", async () => {
  mockApi.leaderboard.mockResolvedValue(
    fakeLeaderboard({ entries: [1, 2, 3, 4].map((r) => fakeEntry(r, `P${r}`, { items: undefined })), me: null }),
  );

  await render(<Board />);

  expect(await screen.findByText("P4")).toBeTruthy();
  expect(screen.queryByText(/items sorted/)).toBeNull();
});

test("when the backend can't be reached, the mockup's board shows, marked as offline", async () => {
  mockApi.leaderboard.mockRejectedValue(new ApiError(0, "Can't reach Sortify."));

  await render(<Board />);

  expect(await screen.findByTestId("offline-note")).toBeTruthy();
  expect(screen.getByLabelText("Place 1: Maya R., 3480 points")).toBeTruthy();
  expect(within(screen.getByTestId("you-row")).getByText("Up 3 spots this week")).toBeTruthy();
});

test("any other failure shows the error, and Try again reloads", async () => {
  mockApi.leaderboard.mockRejectedValueOnce(new ApiError(500, "Server error: boom"));

  await render(<Board />);
  expect(await screen.findByText("Couldn't load the board")).toBeTruthy();
  expect(screen.getByText("Server error: boom")).toBeTruthy();

  await fireEvent.press(screen.getByText("Try again"));

  expect(await screen.findByTestId("podium")).toBeTruthy();
});

test("pull to refresh reloads the board", async () => {
  await render(<Board />);
  await screen.findByTestId("podium");

  await act(async () => {
    await screen.getByTestId("board-scroll").props.refreshControl.props.onRefresh();
  });

  expect(mockApi.leaderboard).toHaveBeenCalledTimes(2);
});

test("the subtitle names the Monday the week started", () => {
  expect(boardSubtitle("week", new Date(2026, 9, 29))).toBe("Ottawa · week of Oct 26"); // a Thursday
  expect(boardSubtitle("week", new Date(2026, 10, 1))).toBe("Ottawa · week of Oct 26"); // Sunday
  expect(boardSubtitle("all")).toBe("Ottawa · all time");
});

test("rank movement compares with your first rank this week, and starts over next week", () => {
  const mon = new Date(2026, 10, 16);
  const thu = new Date(2026, 10, 19);
  const nextMon = new Date(2026, 10, 23);
  expect(rankMovement("week", 8, mon)).toBeNull(); // first look this week
  expect(rankMovement("week", 5, thu)).toBe(3);
  expect(rankMovement("week", 10, thu)).toBe(-2);
  expect(rankMovement("week", 10, nextMon)).toBeNull(); // new week, new baseline

  expect(movementText("week", 3)).toBe("Up 3 spots this week");
  expect(movementText("week", -1)).toBe("Down 1 spot this week");
  expect(movementText("all", 0)).toBe("Same spot as earlier today");
  expect(movementText("week", null)).toBeNull();
});
