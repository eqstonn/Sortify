// Hands the scan from the camera to the result screen. A photo uri and the
// classify result are too big for route params (a web photo is a data: URL),
// so the camera stores them here and the result screen reads them.

import type { ClassifyResult } from "@/lib/api";

export type Scan = { photoUri: string; result: ClassifyResult };

let current: Scan | null = null;

export const lastScan = {
  set(scan: Scan) {
    current = scan;
  },
  get(): Scan | null {
    return current;
  },
};
