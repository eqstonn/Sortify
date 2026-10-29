// The Wrapped tab with the API and navigation faked.

import { fireEvent, render, screen } from "@testing-library/react-native";
import { Share } from "react-native";

import Wrapped from "@/app/(tabs)/wrapped";
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

const press = (name: string) => fireEvent.press(screen.getByRole("button", { name }));
const onCard = (n: number) => expect(screen.getByLabelText(`Card ${n} of 5`)).toBeTruthy();

test("opens on the intro card for this month", async () => {
  await render(<Wrapped />);

  expect(await screen.findByText("SORTIFY WRAPPED · OCTOBER")).toBeTruthy();
  onCard(1);
  expect(screen.getByText("86 items. 5 materials. 1,240 points.")).toBeTruthy();
  const { year, month } = wrappedMonths(new Date())[0];
  expect(mockApi.wrapped).toHaveBeenCalledWith(year, month);
});

test("pages forward through all five cards and back again", async () => {
  await render(<Wrapped />);
  await screen.findByText("SORTIFY WRAPPED · OCTOBER");

  await press("Let's go");
  onCard(2);
  expect(screen.getByText("This month you sorted")).toBeTruthy();
  expect(screen.getByText("86")).toBeTruthy();
  expect(screen.getByText("about 9.2 kg")).toBeTruthy();
  expect(
    screen.getByText("kept out of landfill. That's more than double what the average Sortify user sorted."),
  ).toBeTruthy();

  await press("Next");
  onCard(3);
  expect(screen.getByText("Your top material was")).toBeTruthy();
  expect(screen.getAllByText("Plastic")).toHaveLength(2); // the big word and row 1
  expect(screen.getByText("31 items")).toBeTruthy();
  expect(screen.getByText("E-waste")).toBeTruthy(); // "electronics" from the backend

  await press("Next");
  onCard(4);
  expect(screen.getByText("An old laptop battery")).toBeTruthy();
  expect(
    screen.getByText(
      "Only 2% of Sortify users recycled one this month. It never goes in a bin, and you took it to a drop-off. Nice.",
    ),
  ).toBeTruthy();

  await press("Next");
  onCard(5);
  expect(screen.getByText("#8 in Ottawa")).toBeTruthy();
  expect(screen.getByText("Maya R. · 3,480 pts")).toBeTruthy();
  expect(screen.getByText("Sundays")).toBeTruthy();
  expect(screen.getByText("11 days")).toBeTruthy();
  // The last card has Share and Done instead of Back/Next (mockup 10); swipe to go back
  expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
});

test("Back steps back one card at a time", async () => {
  await render(<Wrapped />);
  await screen.findByText("SORTIFY WRAPPED · OCTOBER");
  await press("Let's go");
  await press("Next");
  await press("Next");
  onCard(4);

  await press("Back");
  onCard(3);
  await press("Back");
  onCard(2);
  await press("Back");
  onCard(1);
  expect(screen.getByRole("button", { name: "Let's go" })).toBeTruthy();
});

async function goToLastCard() {
  await render(<Wrapped />);
  await screen.findByText("SORTIFY WRAPPED · OCTOBER");
  await press("Let's go");
  for (let i = 0; i < 3; i++) await press("Next");
  onCard(5);
}

test("the share button on the last card shares a summary", async () => {
  const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction", activityType: undefined });
  await goToLastCard();

  await press("Share your Wrapped");

  expect(share).toHaveBeenCalledWith({
    message: "My October on Sortify: 86 items sorted, about 9.2 kg kept out of landfill, #8 in Ottawa. ♻️",
  });
});

test("Done and the close button go back Home", async () => {
  await goToLastCard();
  await press("Done");
  expect(router.navigate).toHaveBeenCalledWith("/");

  await press("Close");
  expect(router.navigate).toHaveBeenCalledTimes(2);
});

test("you are the top recycler", async () => {
  mockApi.wrapped.mockResolvedValue(
    fakeWrapped({ rank: 1, top_recycler: { user_id: "me", name: "Sam", avatar: "fox", points: 1240, is_me: true } }),
  );
  await goToLastCard();
  expect(screen.getByText("You! · 1,240 pts")).toBeTruthy();
});

test("an empty month falls back to last month", async () => {
  const [thisMonth, lastMonth] = wrappedMonths(new Date());
  mockApi.wrapped.mockImplementation(async (year, month) =>
    month === thisMonth.month ? emptyWrapped(year, month) : fakeWrapped({ year, month: lastMonth.month }),
  );

  await render(<Wrapped />);

  expect(await screen.findByLabelText("Card 1 of 5")).toBeTruthy();
  expect(mockApi.wrapped).toHaveBeenLastCalledWith(lastMonth.year, lastMonth.month);
});

test("nothing sorted in either month shows a friendly empty state", async () => {
  mockApi.wrapped.mockImplementation(async (year, month) => emptyWrapped(year, month));

  await render(<Wrapped />);

  expect(await screen.findByText("Sort a few items and your monthly recap fills in here.")).toBeTruthy();
  expect(screen.queryByLabelText("Card 1 of 5")).toBeNull();
});

test("a failed load shows the message and can retry", async () => {
  mockApi.wrapped.mockRejectedValueOnce(new ApiError(0, "Can't reach Sortify. Check your connection and try again."));

  await render(<Wrapped />);

  expect(await screen.findByText("Can't reach Sortify. Check your connection and try again.")).toBeTruthy();
  await press("Try again");
  expect(await screen.findByLabelText("Card 1 of 5")).toBeTruthy();
});
