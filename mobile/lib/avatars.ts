// The avatars a player can pick (Avatar in app/schemas.py), drawn as emoji.

import type { Avatar } from "@/lib/api";

export const AVATARS: Record<Avatar, string> = {
  sprout: "🌱",
  leaf: "🍃",
  tree: "🌳",
  cactus: "🌵",
  flower: "🌸",
  mushroom: "🍄",
  bee: "🐝",
  fox: "🦊",
  owl: "🦉",
  turtle: "🐢",
};

export const AVATAR_IDS = Object.keys(AVATARS) as Avatar[];

/** The emoji for an avatar id from the backend; unknown ids get the sprout. */
export function avatarEmoji(id: string): string {
  return AVATARS[id as Avatar] ?? AVATARS.sprout;
}
