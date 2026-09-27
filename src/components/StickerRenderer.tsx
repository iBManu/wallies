import { useEffect, useRef } from "react";
import { decompressFrames, parseGIF, type ParsedFrame } from "gifuct-js";
import type { Sticker } from "../types/sticker";

interface Props { sticker: Sticker; url: string; className?: string; style?: React.CSSProperties }
interface DecodedGif { width: number; height: number; frames: ParsedFrame[] }
const gifCache = new Map<string, Promise<DecodedGif>>();

function loadGif(url: string): Promise<DecodedGif> {
  let pending = gifCache.get(url);
  if (!pending) {
    pending = fetch(url).then(async (response) => {
      if (!response.ok) throw new Error(`GIF load failed: ${response.status}`);
      const parsed = parseGIF(await response.arrayBuffer());
      return { width: parsed.lsd.width, height: parsed.lsd.height, frames: decompressFrames(parsed, true) };
    }).catch((error) => { gifCache.delete(url); throw error; });
    gifCache.set(url, pending);
  }
  return pending;
}

function hasProcessing(sticker: Sticker, gif: boolean) {
  const { crop, chromaKey, playbackSpeed } = sticker;
  return chromaKey.enabled || crop.top > 0 || crop.right > 0 || crop.bottom > 0 || crop.left > 0 || (gif && playbackSpeed !== 1);
}

function rgb(hex: string) {
  const value = hex.replace("#", "");
  const parsed = Number.parseInt(value.length === 3 ? value.split("").map((c) => c + c).join("") : value, 16);
  return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
}

function outputFrame(canvas: HTMLCanvasElement, source: CanvasImageSource, sourceWidth: number, sourceHeight: number, sticker: Sticker) {
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width * devicePixelRatio));
  const height = Math.max(1, Math.round(bounds.height * devicePixelRatio));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return;
  context.imageSmoothingEnabled = !sticker.pixelated;
  context.clearRect(0, 0, width, height);
  const { top, right, bottom, left } = sticker.crop;
  const sx = sourceWidth * left;
  const sy = sourceHeight * top;
  const sw = sourceWidth * Math.max(0.01, 1 - left - right);
  const sh = sourceHeight * Math.max(0.01, 1 - top - bottom);
  const scale = Math.min(width / sw, height / sh);
  const dw = sticker.maintainAspectRatio ? sw * scale : width;
  const dh = sticker.maintainAspectRatio ? sh * scale : height;
  context.drawImage(source, sx, sy, sw, sh, (width - dw) / 2, (height - dh) / 2, dw, dh);
  if (!sticker.chromaKey.enabled) return;
  const pixels = context.getImageData(0, 0, width, height);
  const [red, green, blue] = rgb(sticker.chromaKey.color);
  const threshold = Math.max(1, sticker.chromaKey.tolerance * 4.42);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const distance = Math.hypot(pixels.data[index] - red, pixels.data[index + 1] - green, pixels.data[index + 2] - blue);
    if (distance < threshold) {
      const feather = Math.max(0, Math.min(1, (distance - threshold * 0.65) / (threshold * 0.35)));
      pixels.data[index + 3] = Math.round(pixels.data[index + 3] * feather);
    }
  }
  context.putImageData(pixels, 0, 0);
}

export function StickerRenderer({ sticker, url, className, style }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef(sticker);
  const redrawRef = useRef<(() => void) | null>(null);
  settingsRef.current = sticker;
  const gif = /\.gif(?:$|[?#])/i.test(sticker.source);
  const processing = hasProcessing(sticker, gif);

  useEffect(() => {
    if (!processing || !url || !canvasRef.current) return;
    const canvas = canvasRef.current;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let image: HTMLImageElement | undefined;
    redrawRef.current = null;
    if (gif) {
      void loadGif(url).then(({ width, height, frames }) => {
        if (disposed || !frames.length) return;
        const composite = document.createElement("canvas");
        composite.width = width;
        composite.height = height;
        const context = composite.getContext("2d");
        if (!context) return;
        let index = 0;
        let previous: ParsedFrame | undefined;
        let restore: ImageData | undefined;
        const draw = () => {
          if (disposed) return;
          if (previous?.disposalType === 2) context.clearRect(previous.dims.left, previous.dims.top, previous.dims.width, previous.dims.height);
          else if (previous?.disposalType === 3 && restore) context.putImageData(restore, 0, 0);
          const frame = frames[index];
          restore = frame.disposalType === 3 ? context.getImageData(0, 0, width, height) : undefined;
          const patch = document.createElement("canvas");
          patch.width = frame.dims.width;
          patch.height = frame.dims.height;
          patch.getContext("2d")?.putImageData(new ImageData(new Uint8ClampedArray(frame.patch), patch.width, patch.height), 0, 0);
          context.drawImage(patch, frame.dims.left, frame.dims.top);
          previous = frame;
          outputFrame(canvas, composite, width, height, settingsRef.current);
          index = (index + 1) % frames.length;
          timer = setTimeout(draw, Math.max(20, (frame.delay || 100) / settingsRef.current.playbackSpeed));
        };
        redrawRef.current = () => outputFrame(canvas, composite, width, height, settingsRef.current);
        draw();
      }).catch((error) => console.error("Could not decode GIF", error));
    } else {
      image = new Image();
      image.onload = () => {
        if (disposed || !image) return;
        redrawRef.current = () => image && outputFrame(canvas, image, image.naturalWidth, image.naturalHeight, settingsRef.current);
        redrawRef.current();
      };
      image.src = url;
    }
    return () => { disposed = true; if (timer) clearTimeout(timer); if (image) image.src = ""; redrawRef.current = null; if (gif) gifCache.delete(url); };
  }, [processing, url, gif]);

  useEffect(() => { redrawRef.current?.(); }, [sticker.crop, sticker.chromaKey, sticker.playbackSpeed, sticker.width, sticker.height, sticker.maintainAspectRatio, sticker.pixelated]);

  useEffect(() => {
    if (!processing || !canvasRef.current) return;
    const observer = new ResizeObserver(() => redrawRef.current?.());
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [processing]);

  if (!processing) return <img className={className} style={{ ...style, objectFit: sticker.maintainAspectRatio ? "contain" : "fill", imageRendering: sticker.pixelated ? "pixelated" : "auto" }} src={url} alt={sticker.name} draggable={false} />;
  return <canvas className={className} style={{ ...style, imageRendering: sticker.pixelated ? "pixelated" : "auto" }} ref={canvasRef} aria-label={sticker.name} />;
}
