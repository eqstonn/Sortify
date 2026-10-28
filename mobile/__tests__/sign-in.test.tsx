import { act, fireEvent, render, renderHook, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import SignIn from "@/app/sign-in";
import { api } from "@/lib/api";
import { SessionProvider, useSession } from "@/lib/session";

jest.mock("@/lib/supabase", () => ({ getAccessToken: jest.fn(async () => "test-token"), signOut: jest.fn() }));
jest.mock("@/lib/api", () => ({ ...jest.requireActual("@/lib/api"), api: { updateMe: jest.fn() } }));

const mockApi = api as jest.Mocked<typeof api>;

// expo-sqlite's localStorage is native, so tests get a plain in-memory one
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
} as Storage;

beforeEach(() => {
  jest.clearAllMocks();
  store.clear();
});

async function renderSignIn() {
  await render(
    <SessionProvider>
      <SignIn />
    </SessionProvider>,
  );
}

test("Start sorting stays off until there's a name", async () => {
  await renderSignIn();
  await fireEvent.press(screen.getByRole("button", { name: "Start sorting" }));
  await fireEvent.changeText(screen.getByLabelText("Your name"), "   ");
  await fireEvent.press(screen.getByRole("button", { name: "Start sorting" }));

  expect(mockApi.updateMe).not.toHaveBeenCalled();
});

test("sends the trimmed name and the picked avatar", async () => {
  mockApi.updateMe.mockResolvedValue({} as never);

  await renderSignIn();
  await fireEvent.changeText(screen.getByLabelText("Your name"), "  Sam ");
  await fireEvent.press(screen.getByRole("radio", { name: "fox" }));
  await fireEvent.press(screen.getByRole("button", { name: "Start sorting" }));

  expect(mockApi.updateMe).toHaveBeenCalledWith({ name: "Sam", avatar: "fox" });
});

test("shows the error and lets you try again", async () => {
  mockApi.updateMe.mockRejectedValue(new Error("Can't reach Sortify. Check your connection and try again."));

  await renderSignIn();
  await fireEvent.changeText(screen.getByLabelText("Your name"), "Sam");
  await fireEvent.press(screen.getByRole("button", { name: "Start sorting" }));

  expect(screen.getByText(/Can't reach Sortify/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Start sorting" })).toBeEnabled();
});

test("sign-in is remembered on the phone and cleared by sign-out", async () => {
  mockApi.updateMe.mockResolvedValue({} as never);
  const wrapper = ({ children }: { children: ReactNode }) => <SessionProvider>{children}</SessionProvider>;

  const { result } = await renderHook(() => useSession(), { wrapper });
  expect(result.current.signedIn).toBe(false);

  await act(() => result.current.signIn("Sam", "owl"));
  expect(result.current.signedIn).toBe(true);
  expect((await renderHook(() => useSession(), { wrapper })).result.current.signedIn).toBe(true); // after a restart

  await act(() => result.current.signOut());
  expect(result.current.signedIn).toBe(false);
});
