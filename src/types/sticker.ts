export interface Sticker {
  id: string;
  name: string;
  source: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  alwaysOnTop: boolean;
  clickThrough: boolean;
  locked: boolean;
  visible: boolean;
  collectionId?: string | null;
  rotation: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  playbackSpeed: number;
  aspectRatio?: number | null;
  maintainAspectRatio: boolean;
  pixelated: boolean;
  crop: CropSettings;
  chromaKey: ChromaKeySettings;
  monitorId?: string | null;
  createdAt: number;
}

export interface CropSettings {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChromaKeySettings {
  enabled: boolean;
  color: string;
  tolerance: number;
}

export interface StickerSnapshot {
  stickers: Sticker[];
  collections: StickerCollection[];
  editMode: boolean;
}

export interface StickerCollection {
  id: string;
  name: string;
  emoji: string;
  enabled: boolean;
  createdAt: number;
}

export interface StickerPatch {
  name?: string;
  opacity?: number;
  alwaysOnTop?: boolean;
  clickThrough?: boolean;
  locked?: boolean;
  visible?: boolean;
  collectionId?: string | null;
  rotation?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  playbackSpeed?: number;
  maintainAspectRatio?: boolean;
  pixelated?: boolean;
  crop?: CropSettings;
  chromaKey?: ChromaKeySettings;
}
