// lib/kv.ts for the web build: the browser's localStorage.

export function kvGet(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function kvSet(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // not remembered; nothing else to do
  }
}
