// Tiny key-value storage for app settings (appearance, last level seen),
// saved on the phone with expo-sqlite's kv-store. The web build uses
// lib/kv.web.ts instead (expo-sqlite on web needs extra server setup).
// Reads and writes never throw: a setting that can't be saved just isn't remembered.

import Storage from "expo-sqlite/kv-store";

export function kvGet(key: string): string | null {
  try {
    return Storage.getItemSync(key);
  } catch {
    return null;
  }
}

export function kvSet(key: string, value: string): void {
  try {
    Storage.setItemSync(key, value);
  } catch {
    // not remembered; nothing else to do
  }
}
