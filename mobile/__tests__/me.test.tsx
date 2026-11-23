// The Me tab with the API faked.

import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";

import Me from "@/app/(tabs)/me";
import { api, ApiError } from "@/lib/api";
import { recyclingSince } from "@/lib/format";

import { fakeBadges, fakeProfile, fakeScan } from "@/test-utils/fixtures";

jest.mock("@/lib/supabase", () => ({ getAccessToken: jest.fn(async () => "test-token") }));
jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return { ...actual, api: { me: jest.fn(), myScans: jest.fn(), updateMe: jest.fn(), uploadAvatar: jest.fn(), removeAvatar: jest.fn() } };
});
const mockSignOut = jest.fn();
jest.mock("@/lib/session", () => ({ useSession: () => ({ signOut: mockSignOut }) }));
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return { useFocusEffect: (effect: () => void) => useEffect(effect, [effect]), router: { push: jest.fn() } };
});

const mockApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.me.mockResolvedValue(fakeProfile());
  mockApi.myScans.mockResolvedValue([fakeScan()]);
});

test("the header shows the default avatar, name, when you started, the level pill and your plant", async () => {
  await render(<Me />);

  expect(await screen.findByText("Sam")).toBeTruthy();
  expect(screen.getByTestId("avatar-default")).toBeTruthy(); // the fixture's avatar is an old emoji id
  expect(screen.getByText("Recycling since Oct 2026")).toBeTruthy();
  expect(screen.getByTestId("level-pill")).toHaveTextContent("Level 3 · Sapling");
  expect(screen.getByTestId("plant").props.accessibilityLabel).toBe("Your plant: level 3, Sapling");
});

test("four stat tiles, with total points first", async () => {
  await render(<Me />);

  expect(await screen.findByLabelText("1,240 total points")).toBeTruthy();
  expect(screen.getByLabelText("42 items sorted")).toBeTruthy();
  expect(screen.getByLabelText("3.2 kg kept out of landfill")).toBeTruthy();
  expect(screen.getByLabelText("6 days longest streak")).toBeTruthy();
});

test("Recycling since is the month of your first confirmed sort", () => {
  expect(
    recyclingSince([
      fakeScan({ confirmed_at: "2026-11-02T12:00:00Z" }),
      fakeScan({ confirmed_at: "2026-09-20T12:00:00Z" }),
      fakeScan({ status: "pending", confirmed_at: null, created_at: "2026-06-01T12:00:00Z" }), // never confirmed
    ]),
  ).toBe("Sep 2026");
  expect(recyclingSince([])).toBeNull();
});

test("before your first sort it says you're just getting started", async () => {
  mockApi.myScans.mockResolvedValue([]);

  await render(<Me />);

  expect(await screen.findByText("Just getting started")).toBeTruthy();
});

test("if your scans can't load, the profile still shows without the date", async () => {
  mockApi.myScans.mockRejectedValue(new ApiError(500, "boom"));

  await render(<Me />);

  expect(await screen.findByText("Sam")).toBeTruthy();
  expect(screen.queryByTestId("since")).toBeNull();
});

test('"What you sort" has a bar per material, labelled for people, the top one full', async () => {
  mockApi.me.mockResolvedValue(
    fakeProfile({
      breakdown: [
        { material: "plastic", count: 31, percent: 36 },
        { material: "electronics", count: 7, percent: 8 },
      ],
    }),
  );

  await render(<Me />);

  expect(await screen.findByText("Plastic")).toBeTruthy();
  expect(screen.getByText("E-waste")).toBeTruthy();
  expect(screen.getByText("31")).toBeTruthy();
  expect(screen.getByLabelText("Plastic: 31")).toHaveAccessibilityValue({ now: 100 });
  expect(screen.getByLabelText("E-waste: 7")).toHaveAccessibilityValue({ now: 23 });
});

test("a new player is told to scan instead of seeing empty bars", async () => {
  mockApi.me.mockResolvedValue(fakeProfile({ breakdown: [], badges: fakeBadges([]) }));

  await render(<Me />);

  expect(await screen.findByText("Scan your first item to see what you sort.")).toBeTruthy();
  expect(screen.getByText("0 of 4")).toBeTruthy();
});

test("badges come from the backend: earned ones show their icon, the rest are locked", async () => {
  mockApi.me.mockResolvedValue(fakeProfile({ badges: fakeBadges(["first_sort", "ewaste_hero", "streak_7"]) }));

  await render(<Me />);

  expect(await screen.findByText("3 of 4")).toBeTruthy();
  expect(screen.getByLabelText("First sort, earned")).toBeTruthy();
  expect(screen.getByLabelText("E-waste hero, earned")).toBeTruthy();
  const streak = screen.getByLabelText("7-day streak, earned");
  expect(within(streak).getByTestId("icon-Flame")).toBeTruthy();
  const glass = screen.getByLabelText("Glass master, locked. Sort 10 glass bottles or jars");
  expect(within(glass).getByTestId("icon-Lock")).toBeTruthy();
  expect(screen.getAllByTestId("icon-Lock")).toHaveLength(1);
});

test("when the backend can't be reached, the mockup's profile shows, marked as offline", async () => {
  mockApi.me.mockRejectedValue(new ApiError(0, "Can't reach Sortify."));

  await render(<Me />);

  expect(await screen.findByTestId("offline-note")).toBeTruthy();
  expect(screen.getByText("Easton")).toBeTruthy();
  expect(screen.getByText("Recycling since Oct 2026")).toBeTruthy();
  expect(screen.getByLabelText("86 items sorted")).toBeTruthy();
  expect(screen.getByText("3 of 4")).toBeTruthy();
});

test("a failed load shows the backend's message, and Try again reloads", async () => {
  mockApi.me.mockRejectedValueOnce(new ApiError(401, "Your login has expired. Sign in again."));

  await render(<Me />);
  expect(await screen.findByText("Couldn't load your profile")).toBeTruthy();
  expect(screen.getByText("Your login has expired. Sign in again.")).toBeTruthy();

  await fireEvent.press(screen.getByText("Try again"));

  expect(await screen.findByText("Sam")).toBeTruthy();
});

test("a spinner shows while loading", async () => {
  mockApi.me.mockReturnValue(new Promise(() => {}));

  await render(<Me />);

  expect(screen.getByTestId("loading")).toBeTruthy();
});

test("the edit button changes your name (no emoji avatars any more)", async () => {
  mockApi.updateMe.mockResolvedValue(fakeProfile({ name: "Samira" }));

  await render(<Me />);
  await fireEvent.press(await screen.findByRole("button", { name: "Edit profile" }));

  const input = screen.getByLabelText("Your name");
  expect(input.props.value).toBe("Sam");
  expect(screen.queryByText("AVATAR")).toBeNull();
  await fireEvent.changeText(input, "  Samira ");
  await fireEvent.press(screen.getByText("Save"));

  expect(mockApi.updateMe).toHaveBeenCalledWith({ name: "Samira" });
  expect(await screen.findByText("Samira")).toBeTruthy();
  expect(screen.getByText("Recycling since Oct 2026")).toBeTruthy(); // the rest of the page is kept
  expect(screen.queryByLabelText("Your name")).toBeNull(); // sheet closed
});

test("a rejected name shows the backend's message and keeps the sheet open", async () => {
  mockApi.updateMe.mockRejectedValue(new ApiError(422, "Name is too long"));

  await render(<Me />);
  await fireEvent.press(await screen.findByRole("button", { name: "Edit profile" }));
  await fireEvent.press(screen.getByText("Save"));

  expect(await screen.findByText("Name is too long")).toBeTruthy();
  expect(screen.getByLabelText("Your name")).toBeTruthy();
});

test("pull to refresh loads fresh stats", async () => {
  await render(<Me />);
  await screen.findByLabelText("42 items sorted");

  mockApi.me.mockResolvedValue(fakeProfile({ items_sorted: 43 }));
  await act(async () => {
    await screen.getByTestId("me-scroll").props.refreshControl.props.onRefresh();
  });

  expect(screen.getByLabelText("43 items sorted")).toBeTruthy();
});

const PHOTO = "https://storage.test/avatars/u1.jpg?v=1";

test("Change photo: pick one, it's uploaded, and the page shows it while the sheet stays open", async () => {
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: "file:///me.jpg" }] });
  mockApi.uploadAvatar.mockResolvedValue(fakeProfile({ avatar: PHOTO }));

  await render(<Me />);
  await fireEvent.press(await screen.findByRole("button", { name: "Edit profile" }));
  await fireEvent.press(screen.getByRole("button", { name: "Add a photo" }));

  expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ allowsEditing: true, aspect: [1, 1] }));
  expect(mockApi.uploadAvatar).toHaveBeenCalledWith("file:///me.jpg");
  expect(await screen.findAllByTestId("avatar-photo")).toHaveLength(2); // on the page and in the sheet
  expect(screen.getByLabelText("Your name")).toBeTruthy(); // still open
});

test("closing the photo picker changes nothing", async () => {
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: null });

  await render(<Me />);
  await fireEvent.press(await screen.findByRole("button", { name: "Edit profile" }));
  await fireEvent.press(screen.getByRole("button", { name: "Add a photo" }));

  expect(mockApi.uploadAvatar).not.toHaveBeenCalled();
});

test("Remove photo goes back to the default picture", async () => {
  mockApi.me.mockResolvedValue(fakeProfile({ avatar: PHOTO }));
  mockApi.removeAvatar.mockResolvedValue(fakeProfile({ avatar: "sprout" }));

  await render(<Me />);
  await fireEvent.press(await screen.findByRole("button", { name: "Edit profile" }));
  await fireEvent.press(screen.getByRole("button", { name: "Remove photo" }));

  expect(mockApi.removeAvatar).toHaveBeenCalled();
  expect(await screen.findAllByTestId("avatar-default")).toHaveLength(2);
  expect(screen.getByRole("button", { name: "Add a photo" })).toBeTruthy();
});

test("Sign out signs you out", async () => {
  await render(<Me />);

  await fireEvent.press(await screen.findByRole("button", { name: "Sign out" }));

  expect(mockSignOut).toHaveBeenCalled();
});
