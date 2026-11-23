// The Wrapped tab with the API and navigation faked: the story's cards,
// auto-advance, tap and hold controls, sharing, and the empty/error states.

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Share } from "react-native";

import Wrapped from "@/app/(tabs)/wrapped";
import { CARD_MS } from "@/components/WrappedStory";
import { api, ApiError } from "@/lib/api";
import { wrappedMonths } from "@/lib/wrapped";

import { emptyWrapped, fakeWrapped } from "@/test-utils/fixtures";

jest.mock("@/lib/supabase", () => ({ getAccessToken: jest.fn(async () => "test-token") }));
jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return { ...actual, api: { wrapped: jest.fn() } };
});
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { navigate: jest.fn() },
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

const mockApi = api as jest.Mocked<typeof api>;
const { router } = jest.requireMock("expo-router");

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.wrapped.mockResolvedValue(fakeWrapped());
});

afterEach(() => jest.useRealTimers());

const press = (name: string) => fireEvent.press(screen.getByRole("button", { name }));
const onCard = (id: string, n: number, of = 7) => {
  expect(screen.getByTestId(`wrapped-${id}`)).toBeTruthy();
  expect(screen.getByLabelText(`Card ${n} of ${of}`)).toBeTruthy();
};

async function openStory() {
  await render(<Wrapped />);
  await screen.findByTestId("wrapped-intro");
}

test("opens on the intro for this month", async () => {
  await openStory();

  onCard("intro", 1);
  expect(screen.getByText("SORTIFY WRAPPED · OCTOBER 2026")).toBeTruthy();
  expect(screen.getByText("bin.")).toBeTruthy();
  expect(screen.getByText("86 items. 5 materials. 1,240 points.")).toBeTruthy();
  const { year, month } = wrappedMonths(new Date())[0];
  expect(mockApi.wrapped).toHaveBeenCalledWith(year, month);
});

test("tapping the right steps through all seven cards, with the data on each", async () => {
  await openStory();

  await press("Next card");
  onCard("total", 2);
  expect(screen.getByLabelText("86 items")).toBeTruthy(); // the counting number says its final value
  expect(screen.getByText("and 1,240 points earned")).toBeTruthy();

  await press("Next card");
  onCard("material", 3);
  expect(screen.getAllByText("PLASTIC")).toHaveLength(4);
  expect(screen.getByText("31 items · 36% of everything")).toBeTruthy();
  expect(screen.getByText("Then Paper, Metal, Glass")).toBeTruthy();

  await press("Next card");
  onCard("rarest", 4);
  expect(screen.getByText("Battery")).toBeTruthy();
  expect(screen.getByText("An old laptop battery")).toBeTruthy();
  expect(screen.getByText("Only 2% of Sortify users recycled one this month.")).toBeTruthy();

  await press("Next card");
  onCard("kg", 5);
  expect(screen.getByLabelText("9.2 kg")).toBeTruthy();
  expect(screen.getByText("That's about 2 watermelons")).toBeTruthy();

  await press("Next card");
  onCard("rank", 6);
  expect(screen.getByText("#8")).toBeTruthy();
  expect(screen.getByText("of 120 players")).toBeTruthy();
  expect(screen.getByText("Top recycler: Maya R. · 3,480 pts")).toBeTruthy();

  await press("Next card");
  onCard("summary", 7);
  expect(screen.getByText("OCTOBER")).toBeTruthy();
  expect(screen.getByText("11 days")).toBeTruthy();
  expect(screen.getByText("Sundays")).toBeTruthy();

  await press("Next card"); // nothing after the last card
  onCard("summary", 7);
});

test("tapping the left goes back, and stops at the first card", async () => {
  await openStory();
  await press("Next card");
  await press("Next card");

  await press("Previous card");
  onCard("total", 2);
  await press("Previous card");
  await press("Previous card");
  onCard("intro", 1);
});

test("each card moves on by itself after 3 seconds, but the last one stays", async () => {
  jest.useFakeTimers();
  await openStory();

  await act(async () => jest.advanceTimersByTime(CARD_MS));
  onCard("total", 2);
  // Each card starts its own timer once it's on screen, so step 3 s at a time
  for (let i = 0; i < 8; i++) await act(async () => jest.advanceTimersByTime(CARD_MS));
  onCard("summary", 7);
});

test("holding pauses the story, and letting go carries on", async () => {
  jest.useFakeTimers();
  await openStory();
  const zone = screen.getByRole("button", { name: "Next card" });

  await act(async () => jest.advanceTimersByTime(1000));
  await fireEvent(zone, "longPress");
  await act(async () => jest.advanceTimersByTime(CARD_MS * 3));
  onCard("intro", 1); // held: no advance

  await fireEvent(zone, "pressOut");
  await act(async () => jest.advanceTimersByTime(CARD_MS - 1000 - 50));
  onCard("intro", 1); // picks up where it left off: ~2 s still to go
  await act(async () => jest.advanceTimersByTime(100));
  onCard("total", 2);
});

async function goToSummary() {
  await openStory();
  for (let i = 0; i < 6; i++) await press("Next card");
  onCard("summary", 7);
}

test("Share on the summary shares a sentence about the month", async () => {
  const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction", activityType: undefined });
  await goToSummary();

  await press("Share");

  expect(share).toHaveBeenCalledWith({
    message: "My October on Sortify: 86 items sorted, about 9.2 kg kept out of landfill, #8 in Ottawa. ♻️",
  });
});

test("Done and the close button go back Home", async () => {
  await goToSummary();
  await press("Done");
  expect(router.navigate).toHaveBeenCalledWith("/");

  await press("Close");
  expect(router.navigate).toHaveBeenCalledTimes(2);
});

test("no rarest find: that card is skipped", async () => {
  mockApi.wrapped.mockResolvedValue(fakeWrapped({ rarest_find: null }));
  await openStory();

  for (let i = 0; i < 3; i++) await press("Next card");
  onCard("kg", 4, 6);
});

test("you are the top recycler, and #1 gets YOU on the podium", async () => {
  mockApi.wrapped.mockResolvedValue(
    fakeWrapped({ rank: 1, top_recycler: { user_id: "me", name: "Sam", avatar: "fox", points: 1240, is_me: true } }),
  );
  await openStory();
  for (let i = 0; i < 5; i++) await press("Next card");

  onCard("rank", 6);
  expect(screen.getByText("Top recycler: You! · 1,240 pts")).toBeTruthy();
  expect(screen.getByText("YOU")).toBeTruthy();
});

test("with Reduce Motion on, numbers show their final value straight away", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  await openStory();
  await press("Next card");

  expect(screen.getByTestId("total-count")).toHaveTextContent("86");
  jest.restoreAllMocks();
});

test("an empty month falls back to last month", async () => {
  const [thisMonth, lastMonth] = wrappedMonths(new Date());
  mockApi.wrapped.mockImplementation(async (year, month) =>
    month === thisMonth.month ? emptyWrapped(year, month) : fakeWrapped({ year, month: lastMonth.month }),
  );

  await render(<Wrapped />);

  expect(await screen.findByTestId("wrapped-intro")).toBeTruthy();
  expect(mockApi.wrapped).toHaveBeenLastCalledWith(lastMonth.year, lastMonth.month);
});

test("nothing sorted in either month shows a friendly empty state", async () => {
  mockApi.wrapped.mockImplementation(async (year, month) => emptyWrapped(year, month));

  await render(<Wrapped />);

  expect(await screen.findByText("Sort a few items and your monthly recap fills in here.")).toBeTruthy();
  expect(screen.queryByTestId("wrapped-intro")).toBeNull();
});

test("a failed load shows the message and can retry", async () => {
  mockApi.wrapped.mockRejectedValueOnce(new ApiError(0, "Can't reach Sortify. Check your connection and try again."));

  await render(<Wrapped />);

  expect(await screen.findByText("Can't reach Sortify. Check your connection and try again.")).toBeTruthy();
  await press("Try again");
  expect(await screen.findByTestId("wrapped-intro")).toBeTruthy();
});
