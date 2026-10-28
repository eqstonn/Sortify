// The camera screen with expo-camera, the gallery and the API faked.

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { Alert, Linking } from "react-native";

import Scan from "@/app/scan";
import { api, ApiError } from "@/lib/api";
import { lastScan } from "@/lib/lastScan";

import { fakeResult } from "@/test-utils/fixtures";

type Permission = { granted: boolean; canAskAgain: boolean; status: string };

let mockPermission: Permission | null = null;
const mockRequestPermission = jest.fn();
const mockTakePicture = jest.fn();

jest.mock("expo-camera", () => {
  const { forwardRef, useEffect, useImperativeHandle } = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  const CameraView = forwardRef((props: { onCameraReady?: () => void }, ref: unknown) => {
    useImperativeHandle(ref, () => ({ takePictureAsync: mockTakePicture }));
    useEffect(() => props.onCameraReady?.(), []);
    return <View testID="camera" />;
  });
  return { CameraView, useCameraPermissions: () => [mockPermission, mockRequestPermission] };
});
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock("expo-router", () => ({ router: { back: jest.fn(), replace: jest.fn() } }));
jest.mock("@/lib/supabase", () => ({ getAccessToken: jest.fn(async () => "test-token") }));
jest.mock("@/lib/api", () => ({ ...jest.requireActual("@/lib/api"), api: { classify: jest.fn() } }));

const mockApi = api as jest.Mocked<typeof api>;
const mockPicker = ImagePicker.launchImageLibraryAsync as jest.Mock;
const { router } = jest.requireMock("expo-router");

const denied: Permission = { granted: false, canAskAgain: false, status: "denied" };
const granted: Permission = { granted: true, canAskAgain: true, status: "granted" };

beforeEach(() => {
  jest.clearAllMocks();
  mockPermission = granted;
  mockApi.classify.mockResolvedValue(fakeResult());
});

test("asks for the camera the first time", async () => {
  mockPermission = { granted: false, canAskAgain: true, status: "undetermined" };

  await render(<Scan />);

  expect(mockRequestPermission).toHaveBeenCalledTimes(1);
});

test("without camera permission it offers the gallery instead", async () => {
  mockPermission = denied;
  mockPicker.mockResolvedValue({ canceled: false, assets: [{ uri: "file:///gallery.jpg" }] });

  await render(<Scan />);

  expect(screen.getByText("Camera is off")).toBeTruthy();
  expect(screen.queryByTestId("camera")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Choose a photo" }));

  expect(mockApi.classify).toHaveBeenCalledWith("file:///gallery.jpg");
  expect(lastScan.get()?.photoUri).toBe("file:///gallery.jpg");
  expect(router.replace).toHaveBeenCalledWith("/result");
});

test('"Allow camera" opens Settings once the phone stops asking', async () => {
  mockPermission = denied;
  const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);

  await render(<Scan />);
  await fireEvent.press(screen.getByRole("button", { name: "Allow camera" }));

  expect(openSettings).toHaveBeenCalled();
  expect(mockRequestPermission).not.toHaveBeenCalled();
});

test("the shutter takes a photo and opens the result", async () => {
  mockTakePicture.mockResolvedValue({ uri: "file:///shot.jpg", width: 100, height: 100 });

  await render(<Scan />);
  expect(screen.getByText("Fit one item inside the frame")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Take photo" }));

  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/result"));
  expect(mockApi.classify).toHaveBeenCalledWith("file:///shot.jpg");
  expect(lastScan.get()?.result.bin).toBe("blue_bin");
});

test("cancelling the gallery does nothing", async () => {
  mockPicker.mockResolvedValue({ canceled: true, assets: null });

  await render(<Scan />);
  await fireEvent.press(screen.getByRole("button", { name: "Choose from gallery" }));

  expect(mockApi.classify).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});

test("a failed scan shows why and stays on the camera", async () => {
  mockTakePicture.mockResolvedValue({ uri: "file:///shot.jpg" });
  mockApi.classify.mockRejectedValue(new ApiError(502, "Gemini is busy. Try again."));
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

  await render(<Scan />);
  await fireEvent.press(screen.getByRole("button", { name: "Take photo" }));

  await waitFor(() => expect(alert).toHaveBeenCalledWith("Couldn't sort that", "Gemini is busy. Try again."));
  expect(router.replace).not.toHaveBeenCalled();
});

test("Barcode mode turns the shutter off for now", async () => {
  await render(<Scan />);
  await fireEvent.press(screen.getByRole("tab", { name: "Barcode" }));
  await fireEvent.press(screen.getByRole("button", { name: "Take photo" }));

  expect(screen.getByText(/Barcode lookup is coming soon/)).toBeTruthy();
  expect(mockTakePicture).not.toHaveBeenCalled();
});
