import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Sticker, StickerCollection, StickerPatch, StickerSnapshot } from "../types/sticker";

export type GifSource = "all" | "gifcities" | "commons";
export interface OnlineGif { id: string; title: string; url: string; width: number; height: number; source: Exclude<GifSource, "all"> }

export const stickerService = {
  list: () => invoke<StickerSnapshot>("list_stickers"),
  import: (collectionId?: string) => invoke<Sticker | null>("import_sticker", { collectionId }),
  importUrl: (url: string, name?: string, collectionId?: string) => invoke<Sticker>("import_sticker_url", { url, name, collectionId }),
  importBytes: (bytes: number[], name: string, collectionId?: string) => invoke<Sticker>("import_sticker_bytes", { bytes, name, collectionId }),
  searchGifs: (query: string, source: GifSource) => invoke<OnlineGif[]>("search_online_gifs", { query, source }),
  createCollection: (name: string, emoji: string) => invoke<StickerCollection>("create_collection", { name, emoji }),
  updateCollection: (id: string, name: string, emoji: string) => invoke<StickerCollection>("update_collection", { id, name, emoji }),
  setCollectionEnabled: (id: string, enabled: boolean) => invoke<void>("set_collection_enabled", { id, enabled }),
  deleteCollection: (id: string, deleteStickers: boolean) => invoke<void>("delete_collection", { id, deleteStickers }),
  update: (id: string, patch: StickerPatch) =>
    invoke<Sticker>("update_sticker", { id, patch }),
  remove: (id: string) => invoke<void>("delete_sticker", { id }),
  setEditMode: (enabled: boolean) => invoke<void>("set_edit_mode", { enabled }),
  showAll: () => invoke<void>("show_all_stickers"),
  hideAll: () => invoke<void>("hide_all_stickers"),
  assetUrl: async (id: string) => convertFileSrc(await invoke<string>("sticker_asset_path", { id })),
  onChanged: (callback: () => void) => listen("stickers://changed", callback),
  onError: (callback: (error: string) => void) => listen<string>("stickers://error", (event) => callback(event.payload)),
  openEditor: (id: string) => invoke<void>("open_sticker_editor", { id }),
  resize: (id: string, width: number, height: number, x: number, y: number) => invoke<void>("resize_sticker", { id, width, height, x, y }),
};
