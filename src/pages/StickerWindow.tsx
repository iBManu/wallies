import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MoreHorizontal } from "lucide-react";
import { stickerService } from "../services/stickerService";
import { windowService } from "../services/windowService";
import type { Sticker, StickerSnapshot } from "../types/sticker";
import { StickerRenderer } from "../components/StickerRenderer";
import { useSettings } from "../hooks/useSettings";
import { tr } from "../i18n";
import { resizeRectangle, type Rectangle, type ResizeEdge } from "../services/resizeGeometry";
import { stickerTransform } from "../services/stickerTransform";

const resizeEdges: ResizeEdge[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];

export function StickerWindow({ id }: { id: string }) {
  const [sticker, setSticker] = useState<Sticker | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [collectionEnabled, setCollectionEnabled] = useState(true);
  const [url, setUrl] = useState("");
  const { settings } = useSettings();
  const resizeRef = useRef<{ pointerId: number; edge: ResizeEdge; startX: number; startY: number; start: Rectangle; scale: number; ready: boolean } | null>(null);
  const pendingSizeRef = useRef<Rectangle | null>(null);
  const resizingRef = useRef(false);
  const refreshSequenceRef = useRef(0);
  const rotationRef = useRef<{ pointerId: number; startX: number; startRotation: number } | null>(null);
  const pendingRotationRef = useRef<number | null>(null);
  const rotatingRef = useRef(false);
  const queueRotation = (rotation: number) => {
    pendingRotationRef.current = rotation;
    if (rotatingRef.current) return;
    rotatingRef.current = true;
    void (async () => {
      try {
        while (pendingRotationRef.current !== null) {
          const next = pendingRotationRef.current;
          pendingRotationRef.current = null;
          await stickerService.update(id, { rotation: next });
        }
      } catch (error) { pendingRotationRef.current = null; console.error("Could not rotate sticker", error); }
      finally { rotatingRef.current = false; if (pendingRotationRef.current !== null) queueRotation(pendingRotationRef.current); }
    })();
  };
  const queueResize = (rectangle: Rectangle) => {
    pendingSizeRef.current = rectangle;
    if (resizingRef.current) return;
    resizingRef.current = true;
    void (async () => {
      try {
        while (pendingSizeRef.current !== null) {
          const next = pendingSizeRef.current;
          pendingSizeRef.current = null;
          await stickerService.resize(id, next.width, next.height, next.x, next.y);
        }
      } catch (error) { pendingSizeRef.current = null; console.error("Could not resize sticker", error); }
      finally { resizingRef.current = false; if (pendingSizeRef.current !== null) queueResize(pendingSizeRef.current); }
    })();
  };

  useEffect(() => {
    const refresh = async () => {
      const sequence = ++refreshSequenceRef.current;
      const snapshot: StickerSnapshot = await stickerService.list();
      if (sequence !== refreshSequenceRef.current) return;
      const currentSticker = snapshot.stickers.find((item) => item.id === id) ?? null;
      setSticker(currentSticker);
      setCollectionEnabled(currentSticker?.collectionId
        ? snapshot.collections.find((collection) => collection.id === currentSticker.collectionId)?.enabled ?? true
        : true);
      setEditMode(snapshot.editMode);
    };
    void refresh();
    void stickerService.assetUrl(id).then(setUrl);
    const unlisten = stickerService.onChanged(() => void refresh());
    return () => { refreshSequenceRef.current++; void unlisten.then((fn) => fn()); };
  }, [id]);

  if (!sticker) return null;

  // Hidden stickers keep a reusable native window, but release the rendered image
  // and its animation resources until they are shown again.
  if (!sticker.visible || !collectionEnabled) return null;

  return (
    <div className={editMode ? "sticker-window editing" : "sticker-window"} style={{ opacity: sticker.opacity }} onMouseDown={(event) => {
      if (editMode && !sticker.locked && !event.altKey && event.button === 0 && !(event.target as HTMLElement).closest("button")) void windowService.startDrag();
    }} onPointerDown={(event) => {
      if (!editMode || sticker.locked || !event.altKey || event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
      event.preventDefault();
      rotationRef.current = { pointerId: event.pointerId, startX: event.screenX, startRotation: sticker.rotation };
      event.currentTarget.setPointerCapture(event.pointerId);
    }} onPointerMove={(event) => {
      const active = rotationRef.current;
      if (active?.pointerId !== event.pointerId) return;
      const degrees = active.startRotation + (event.screenX - active.startX) * 0.7;
      queueRotation(((Math.round(degrees) % 360) + 360) % 360);
    }} onPointerUp={(event) => {
      if (rotationRef.current?.pointerId !== event.pointerId) return;
      rotationRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }} onPointerCancel={() => { rotationRef.current = null; }}>
      {url && <StickerRenderer sticker={sticker} url={url} style={{ transform: stickerTransform(sticker) }} />}
      {editMode && <>
        <div className="edit-outline" />
        <button className="sticker-more" aria-label={`${tr(settings.language, "editSticker")}: ${sticker.name}`} title={tr(settings.language, "editSticker")} onMouseDown={(event) => event.stopPropagation()} onClick={() => void stickerService.openEditor(id)}><MoreHorizontal size={17} /></button>
        {!sticker.locked && resizeEdges.map((edge) => <button key={edge} className={`resize-hit resize-${edge}`} aria-label={`${tr(settings.language, "resizeSticker")} ${edge}`} title={tr(settings.language, "resizeSticker")} onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => {
          event.preventDefault(); event.stopPropagation();
          const pointerId = event.pointerId;
          resizeRef.current = { pointerId, edge, startX: event.screenX, startY: event.screenY, start: { x: sticker.x, y: sticker.y, width: sticker.width, height: sticker.height }, scale: window.devicePixelRatio || 1, ready: false };
          event.currentTarget.setPointerCapture(event.pointerId);
          const currentWindow = getCurrentWindow();
          void Promise.all([currentWindow.outerPosition(), currentWindow.innerSize()]).then(([position, size]) => {
            const active = resizeRef.current;
            if (active?.pointerId !== pointerId) return;
            active.start = { x: position.x, y: position.y, width: size.width, height: size.height };
            active.ready = true;
          }).catch((error) => { resizeRef.current = null; console.error("Could not read sticker geometry", error); });
        }} onPointerMove={(event) => {
          const active = resizeRef.current;
          if (active?.pointerId !== event.pointerId || active.edge !== edge || !active.ready) return;
          const dx = (event.screenX - active.startX) * active.scale;
          const dy = (event.screenY - active.startY) * active.scale;
          queueResize(resizeRectangle(active.start, edge, dx, dy, sticker.maintainAspectRatio, sticker.aspectRatio || active.start.width / active.start.height));
        }} onPointerUp={(event) => {
          if (resizeRef.current?.pointerId === event.pointerId) resizeRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }} onPointerCancel={() => { resizeRef.current = null; }} />)}
      </>}
    </div>
  );
}
