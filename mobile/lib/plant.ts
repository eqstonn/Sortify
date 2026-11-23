// The plant art: one transparent PNG per level (made by scripts/build_plant_assets.py
// from mobile/assets/redesign/Stage-N-transparent.png). Static, no animation.

export const STAGES = 4;

const POSTERS = [
  require("../assets/plant/stage-1.png"),
  require("../assets/plant/stage-2.png"),
  require("../assets/plant/stage-3.png"),
  require("../assets/plant/stage-4.png"),
];

/** Level number -> plant stage 1..4 (anything outside the range is clamped). */
export function stageFor(level: number): number {
  return Math.min(Math.max(Math.round(level), 1), STAGES);
}

export type PlantArt = { poster: number; file: string };

export function plantArt(stage: number): PlantArt {
  const i = stageFor(stage) - 1;
  return { poster: POSTERS[i], file: `stage-${i + 1}.png` };
}
