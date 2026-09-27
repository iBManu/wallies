import type { Sticker } from "../types/sticker";

export function stickerTransform(sticker: Pick<Sticker, "rotation" | "flipHorizontal" | "flipVertical">): string {
  return `rotate(${sticker.rotation}deg) scale(${sticker.flipHorizontal ? -1 : 1}, ${sticker.flipVertical ? -1 : 1})`;
}
