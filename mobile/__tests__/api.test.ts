// lib/api.ts with fetch and the Supabase login faked: no network, no real backend.

import { api, ApiError } from "@/lib/api";

jest.mock("@/lib/supabase", () => ({
  getAccessToken: jest.fn(async () => "test-token"),
}));

const fetchMock = jest.fn();

function reply(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new SyntaxError("no JSON");
      return body;
    },
  };
}

/** The [url, init] of the nth fetch call */
function call(n = 0): [string, RequestInit & { headers: Record<string, string> }] {
  return fetchMock.mock.calls[n];
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://sortify.test/"; // trailing slash on purpose
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

test("sends the Supabase token and returns the parsed JSON", async () => {
  fetchMock.mockResolvedValue(reply(200, { id: "u1", name: "Easton", total_points: 1240 }));

  const me = await api.me();

  expect(me.name).toBe("Easton");
  const [url, init] = call();
  expect(url).toBe("https://sortify.test/me"); // no double slash
  expect(init.method).toBe("GET");
  expect(init.headers.Authorization).toBe("Bearer test-token");
});

test("public endpoints don't send a token", async () => {
  fetchMock.mockResolvedValue(reply(200, { status: "ok" }));

  await api.health();

  expect(call()[1].headers.Authorization).toBeUndefined();
});

test("skips ngrok's browser warning page", async () => {
  fetchMock.mockResolvedValue(reply(200, { status: "ok" }));

  await api.health();

  expect(call()[1].headers["ngrok-skip-browser-warning"]).toBe("1");
});

test("classify uploads the photo and location as a multipart form", async () => {
  fetchMock.mockResolvedValue(reply(200, { category_id: "aluminum_can", bin: "blue_bin", scan_id: "s1" }));

  const result = await api.classify("file:///photo.jpg", { lat: 45.42, lon: -75.69 });

  expect(result.bin).toBe("blue_bin");
  const [url, init] = call();
  expect(url).toBe("https://sortify.test/classify");
  expect(init.method).toBe("POST");
  expect(init.headers.Authorization).toBe("Bearer test-token");
  // fetch must set the multipart Content-Type (with its boundary), not us
  expect(init.headers["Content-Type"]).toBeUndefined();

  const form = init.body as FormData;
  expect(form).toBeInstanceOf(FormData);
  expect(form.get("lat")).toBe("45.42");
  expect(form.get("lon")).toBe("-75.69");
  expect(form.has("image")).toBe(true);
});

test("classify without location sends only the photo", async () => {
  fetchMock.mockResolvedValue(reply(200, {}));

  await api.classify("file:///photo.jpg");

  const form = call()[1].body as FormData;
  expect(form.has("image")).toBe(true);
  expect(form.has("lat")).toBe(false);
});

test("JSON bodies are sent with a JSON content type", async () => {
  fetchMock.mockResolvedValue(reply(200, { category_id: "glass_bottle" }));

  await api.correctScan("s1", { category_id: "glass_bottle" });

  const [url, init] = call();
  expect(url).toBe("https://sortify.test/scans/s1/correct");
  expect(init.method).toBe("POST");
  expect(init.headers["Content-Type"]).toBe("application/json");
  expect(JSON.parse(init.body as string)).toEqual({ category_id: "glass_bottle" });
});

test("confirm, leaderboard and schedule hit the right paths", async () => {
  fetchMock.mockResolvedValue(reply(200, {}));

  await api.confirmScan("s1");
  await api.leaderboard("all");
  await api.setSchedule({ pickup_day: "tuesday", this_week: "blue_bin" });

  expect(call(0)[0]).toBe("https://sortify.test/scans/s1/confirm");
  expect(call(0)[1].method).toBe("POST");
  expect(call(1)[0]).toBe("https://sortify.test/leaderboard?range=all");
  expect(call(2)[0]).toBe("https://sortify.test/me/schedule");
  expect(call(2)[1].method).toBe("PUT");
});

test("a backend error becomes an ApiError with FastAPI's message", async () => {
  fetchMock.mockResolvedValue(reply(409, { detail: "You already confirmed this scan" }));

  const error = await api.confirmScan("s1").catch((e) => e);

  expect(error).toBeInstanceOf(ApiError);
  expect(error.status).toBe(409);
  expect(error.message).toBe("You already confirmed this scan");
});

test("a validation error shows its first message", async () => {
  fetchMock.mockResolvedValue(
    reply(422, { detail: [{ loc: ["body", "name"], msg: "String should have at least 1 character" }] }),
  );

  await expect(api.updateMe({ name: "" })).rejects.toMatchObject({
    status: 422,
    message: "String should have at least 1 character",
  });
});

test("an error without JSON still gives a readable message", async () => {
  fetchMock.mockResolvedValue(reply(502, undefined));

  await expect(api.me()).rejects.toMatchObject({ status: 502, message: expect.stringContaining("502") });
});

test("no connection becomes an ApiError with status 0", async () => {
  fetchMock.mockRejectedValue(new TypeError("Network request failed"));

  await expect(api.me()).rejects.toMatchObject({ status: 0, message: expect.stringContaining("Can't reach") });
});

test("nextPickup is null until a pickup day is set", async () => {
  fetchMock.mockResolvedValue(reply(404, { detail: "Set your pickup day first (PUT /me/schedule)" }));

  await expect(api.nextPickup()).resolves.toBeNull();
});

test("nextPickup still throws other errors", async () => {
  fetchMock.mockResolvedValue(reply(500, { detail: "boom" }));

  await expect(api.nextPickup()).rejects.toMatchObject({ status: 500 });
});

test("a missing API URL is a clear error", async () => {
  delete process.env.EXPO_PUBLIC_API_URL;

  await expect(api.health()).rejects.toThrow("EXPO_PUBLIC_API_URL");
});

test("Wrapped asks for the year and month in the path", async () => {
  fetchMock.mockResolvedValue(reply(200, { year: 2026, month: 10, items: 0 }));

  await api.wrapped(2026, 10);

  const [url, init] = call();
  expect(url).toBe("https://sortify.test/wrapped/2026/10");
  expect(init.headers.Authorization).toBe("Bearer test-token");
});

test("Discover weekly is a signed-in GET", async () => {
  fetchMock.mockResolvedValue(reply(200, { item: "Greasy pizza box", found: false }));

  const discover = await api.discoverCurrent();

  expect(discover.item).toBe("Greasy pizza box");
  expect(call()[0]).toBe("https://sortify.test/discover/current");
  expect(call()[1].headers.Authorization).toBe("Bearer test-token");
});
