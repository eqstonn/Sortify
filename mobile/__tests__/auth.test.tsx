// Sign in, create an account, reset password, and the session that picks
// between them. Supabase is faked: these tests check what the screens send
// it and how they react to what it says.

import { act, fireEvent, render, renderHook, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import type { ReactNode } from "react";

import ResetPassword from "@/app/reset-password";
import SignIn from "@/app/sign-in";
import SignUp from "@/app/sign-up";
import { SessionProvider, useSession } from "@/lib/session";
import * as auth from "@/lib/supabase";

// Supabase's onAuthStateChange: the test plays Supabase by calling `emit`
let emit: (event: string, session: unknown) => void = () => {};
jest.mock("@/lib/supabase", () => ({
  getAccessToken: jest.fn(async () => "test-token"),
  signInWithEmail: jest.fn(async () => {}),
  signUpWithEmail: jest.fn(async () => true),
  sendPasswordReset: jest.fn(async () => {}),
  signInWithGoogle: jest.fn(async () => true),
  setNewPassword: jest.fn(async () => {}),
  exchangeCode: jest.fn(async () => {}),
  signOut: jest.fn(async () => {}),
  supabase: {
    auth: {
      onAuthStateChange: (cb: typeof emit) => {
        emit = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signOut: jest.fn(async () => {}),
      getSession: jest.fn(async () => ({ data: { session: null } })),
    },
  },
}));
jest.mock("expo-linking", () => ({ useURL: () => null }));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

const mockAuth = auth as jest.Mocked<typeof auth>;

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

const wrapper = ({ children }: { children: ReactNode }) => <SessionProvider>{children}</SessionProvider>;
const renderIn = (ui: React.ReactElement) => render(ui, { wrapper });

async function fill(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText("Email"), email);
  await fireEvent.changeText(screen.getByLabelText("Password"), password);
}

// ---------- sign in ----------

test("signing in sends the email and password, remembered by default", async () => {
  await renderIn(<SignIn />);
  await fill(" sam@example.com ", "hunter22");

  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

  expect(screen.getByRole("checkbox", { name: "Remember me" })).toBeChecked();
  expect(mockAuth.signInWithEmail).toHaveBeenCalledWith(" sam@example.com ", "hunter22", true);
});

test("unticking Remember me signs in for this session only", async () => {
  await renderIn(<SignIn />);
  await fill("sam@example.com", "hunter22");

  await fireEvent.press(screen.getByRole("checkbox", { name: "Remember me" }));
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

  expect(mockAuth.signInWithEmail).toHaveBeenCalledWith("sam@example.com", "hunter22", false);
});

test("a missing email or password is caught before asking Supabase", async () => {
  await renderIn(<SignIn />);

  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  expect(screen.getByText("Type the email you signed up with.")).toBeTruthy();

  await fill("sam@example.com", "");
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  expect(screen.getByText("Type your password.")).toBeTruthy();
  expect(mockAuth.signInWithEmail).not.toHaveBeenCalled();
});

test("a wrong password shows Supabase's answer", async () => {
  mockAuth.signInWithEmail.mockRejectedValueOnce(new Error("Wrong email or password."));
  await renderIn(<SignIn />);
  await fill("sam@example.com", "nope");

  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

  expect(await screen.findByText("Wrong email or password.")).toBeTruthy();
});

test("the eye shows and hides the password", async () => {
  await renderIn(<SignIn />);
  const password = screen.getByLabelText("Password");
  expect(password.props.secureTextEntry).toBe(true);

  await fireEvent.press(screen.getByRole("button", { name: "Show password" }));
  expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(false);
  await fireEvent.press(screen.getByRole("button", { name: "Hide password" }));
  expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(true);
});

test("Forgot password emails a reset link to the address typed above", async () => {
  await renderIn(<SignIn />);

  await fireEvent.press(screen.getByRole("button", { name: "Forgot password?" }));
  expect(screen.getByText("Type your email above first, then tap Forgot password.")).toBeTruthy();
  expect(mockAuth.sendPasswordReset).not.toHaveBeenCalled();

  await fireEvent.changeText(screen.getByLabelText("Email"), "sam@example.com");
  await fireEvent.press(screen.getByRole("button", { name: "Forgot password?" }));

  expect(mockAuth.sendPasswordReset).toHaveBeenCalledWith("sam@example.com");
  expect(await screen.findByText(/We sent a link to sam@example.com/)).toBeTruthy();
});

test("Google signs in with the Remember me choice", async () => {
  await renderIn(<SignIn />);

  await fireEvent.press(screen.getByRole("checkbox", { name: "Remember me" }));
  await fireEvent.press(screen.getByRole("button", { name: "Continue with Google" }));

  expect(mockAuth.signInWithGoogle).toHaveBeenCalledWith(false);
});

test("Create an account opens the sign-up screen", async () => {
  await renderIn(<SignIn />);

  await fireEvent.press(screen.getByRole("button", { name: "Create an account" }));

  expect(router.push).toHaveBeenCalledWith("/sign-up");
});

// ---------- create an account ----------

test("creating an account sends the name with it", async () => {
  await renderIn(<SignUp />);
  await fireEvent.changeText(screen.getByLabelText("Name"), "Sam");
  await fill("sam@example.com", "hunter22");

  await fireEvent.press(screen.getByRole("button", { name: "Create account" }));

  expect(mockAuth.signUpWithEmail).toHaveBeenCalledWith("Sam", "sam@example.com", "hunter22");
});

test("sign-up checks the name and password length first", async () => {
  await renderIn(<SignUp />);

  await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
  expect(screen.getByText(/Type your name/)).toBeTruthy();

  await fireEvent.changeText(screen.getByLabelText("Name"), "Sam");
  await fill("sam@example.com", "123");
  await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
  expect(screen.getByText("Your password needs at least 6 characters.")).toBeTruthy();
  expect(mockAuth.signUpWithEmail).not.toHaveBeenCalled();
});

test("when Supabase wants the email confirmed first, sign-up says to check your inbox", async () => {
  mockAuth.signUpWithEmail.mockResolvedValueOnce(false);
  await renderIn(<SignUp />);
  await fireEvent.changeText(screen.getByLabelText("Name"), "Sam");
  await fill("sam@example.com", "hunter22");

  await fireEvent.press(screen.getByRole("button", { name: "Create account" }));

  expect(await screen.findByText(/Open the link we sent to sam@example.com, then sign in/)).toBeTruthy();
});

test("Sign in goes back to the sign-in screen", async () => {
  await renderIn(<SignUp />);

  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

  expect(router.back).toHaveBeenCalled();
});

// ---------- the session ----------

const user = { access_token: "t", user: { id: "u1", is_anonymous: false } };

test("the session follows Supabase: loading, then signed out, signed in, signed out", async () => {
  const { result } = await renderHook(() => useSession(), { wrapper });
  expect(result.current.state).toBe("loading"); // the splash shows

  await act(async () => emit("INITIAL_SESSION", null));
  expect(result.current.state).toBe("signedOut");

  await act(async () => emit("SIGNED_IN", user));
  expect(result.current.state).toBe("signedIn");

  await act(async () => emit("SIGNED_OUT", null));
  expect(result.current.state).toBe("signedOut");
});

test("an old guest (anonymous) login is signed out", async () => {
  jest.useFakeTimers();
  const { result } = await renderHook(() => useSession(), { wrapper });

  await act(async () => emit("INITIAL_SESSION", { ...user, user: { id: "g", is_anonymous: true } }));
  await act(async () => jest.runAllTimers());

  expect(result.current.state).toBe("signedOut");
  expect(mockAuth.supabase.auth.signOut).toHaveBeenCalled();
  jest.useRealTimers();
});

test("a reset link shows only the new-password screen until the password is saved", async () => {
  const { result } = await renderHook(() => useSession(), { wrapper });

  await act(async () => emit("PASSWORD_RECOVERY", user));
  await act(async () => emit("SIGNED_IN", user)); // Supabase also says signed in: stay on the reset screen
  expect(result.current.state).toBe("recovering");

  await act(async () => result.current.finishRecovery());
  expect(result.current.state).toBe("signedIn");
});

test("the new-password screen saves the password, then lets you in", async () => {
  await renderIn(<ResetPassword />);
  await act(async () => emit("PASSWORD_RECOVERY", user));

  await fireEvent.changeText(screen.getByLabelText("New password"), "abc");
  await fireEvent.press(screen.getByRole("button", { name: "Save and sign in" }));
  expect(screen.getByText("Your password needs at least 6 characters.")).toBeTruthy();

  await fireEvent.changeText(screen.getByLabelText("New password"), "brand-new-pw");
  await fireEvent.press(screen.getByRole("button", { name: "Save and sign in" }));
  expect(mockAuth.setNewPassword).toHaveBeenCalledWith("brand-new-pw");
});
