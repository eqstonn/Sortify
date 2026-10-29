// The Board tab with the API faked.

import { act, fireEvent, render, screen, within } from "@testing-library/react-native";

import Board from "@/app/(tabs)/board";
import { api, ApiError } from "@/lib/api";
import { boardSubtitle } from "@/lib/format";

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
  mockApi.leaderboard.mockImplementation(async (range = "week") => fakeLeaderboard({ range }));
});

test("the top 3 are on the podium, #2 #1 #3 left to right", async () => {
  await render(<Board />);

  const podium = await screen.findByTestId("podium");
  expect(mockApi.leaderboard).toHaveBeenCalledWith("week");
  expect(within(podium).getByLabelText("Place 1: Maya R., 3900 points")).toBeTruthy();
  const places = within(podium)
    .getAllByLabelText(/^Place/)
    .map((el) => el.props.accessibilityLabel.split(":")[0]);
  expect(places).toEqual(["Place 2", "Place 1", "Place 3"]);
  expect(within(podium).getByTestId("icon-crown")).toBeTruthy();
});

test("the rest are listed below with items sorted", async () => {
  await render(<Board />);

  expect(await screen.findByText("Liam K.")).toBeTruthy();
  expect(screen.getByText("46 items sorted")).toBeTruthy();
  expect(screen.getByText("Chloe M.")).toBeTruthy();
  expect(screen.getAllByText("Maya R.")).toHaveLength(1); // on the podium, not in the list too
});

test("your own row is highlighted and pinned at the bottom", async () => {
  await render(<Board />);

  await screen.findByTestId("podium");
  const mine = screen.getAllByTestId("my-row");
  expect(mine).toHaveLength(2); // in the list and pinned
  expect(within(mine[1]).getByText("You")).toBeTruthy();
  expect(within(mine[1]).getByText("1,240")).toBeTruthy();
  expect(within(mine[1]).getByText("22 items sorted")).toBeTruthy();
});

test("outside the top 20 you still get your row at the bottom", async () => {
  const me = fakeEntry(35, "Sam", { is_me: true, points: 120 });
  mockApi.leaderboard.mockResolvedValue(
    fakeLeaderboard({ entries: Array.from({ length: 20 }, (_, i) => fakeEntry(i + 1, `P${i + 1}`)), me }),
  );

  await render(<Board />);

  const mine = await screen.findByTestId("my-row");
  expect(within(mine).getByText("35")).toBeTruthy();
  expect(within(mine).getByText("You")).toBeTruthy();
  expect(within(mine).getByText("Keep sorting to reach the top 20")).toBeTruthy();
});

test("before you score, the bottom says you're not ranked", async () => {
  mockApi.leaderboard.mockResolvedValue(fakeLeaderboard({ me: null, entries: [fakeEntry(1, "Maya R.")] }));

  await render(<Board />);

  expect(await screen.findByTestId("not-ranked")).toBeTruthy();
  expect(screen.queryByTestId("my-row")).toBeNull();
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

test("an empty board invites you to take #1", async () => {
  mockApi.leaderboard.mockResolvedValue(fakeLeaderboard({ entries: [], me: null }));

  await render(<Board />);

  expect(await screen.findByText("No one’s on the board yet")).toBeTruthy();
});

test("without migration 004, rows just leave out the item count", async () => {
  mockApi.leaderboard.mockResolvedValue(
    fakeLeaderboard({ entries: [1, 2, 3, 4].map((r) => fakeEntry(r, `P${r}`, { items: undefined })), me: null }),
  );

  await render(<Board />);

  expect(await screen.findByText("P4")).toBeTruthy();
  expect(screen.queryByText(/items sorted/)).toBeNull();
});

test("a failed load shows the error, and Try again reloads", async () => {
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
