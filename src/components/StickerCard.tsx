import { useEffect, useState } from "react";
import { Eye, EyeOff, MoreHorizontal, Pin, PinOff } from "lucide-react";
import { tr, type Language } from "../i18n";
import { stickerService } from "../services/stickerService";
import type { Sticker } from "../types/sticker";
import { StickerRenderer } from "./StickerRenderer";
import { stickerTransform } from "../services/stickerTransform";

export function StickerCard({ sticker, language, onError, onDragStart, onDragEnd }: { sticker: Sticker; language: Language; onError: (error: string) => void; onDragStart: (id: string) => void; onDragEnd: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => { void stickerService.assetUrl(sticker.id).then(setUrl).catch((error) => onError(String(error))); }, [sticker.id]);
  const update = (patch: { visible?: boolean; alwaysOnTop?: boolean }) => void stickerService.update(sticker.id, patch).catch((error) => onError(String(error)));
  return <article className="library-card" draggable data-sticker-id={sticker.id} data-drop-collection-id={sticker.collectionId || ""} onDragStart={(event) => { event.dataTransfer.setData("application/x-desktop-sticker-id", sticker.id); event.dataTransfer.setData("text/plain", `desktop-sticker:${sticker.id}`); event.dataTransfer.effectAllowed = "move"; onDragStart(sticker.id); }} onDragEnd={onDragEnd}>
    <div className="library-thumb">{url && <StickerRenderer sticker={sticker} url={url} style={{ transform: stickerTransform(sticker) }} />}</div>
    <div className="library-card-info"><div className="library-card-title"><strong title={sticker.name}>{sticker.name}</strong><small>{sticker.width} × {sticker.height}</small></div><button title={tr(language, sticker.visible ? "hideSticker" : "showSticker")} aria-label={tr(language, sticker.visible ? "hideSticker" : "showSticker")} onClick={() => update({ visible: !sticker.visible })}>{sticker.visible ? <Eye size={16} /> : <EyeOff size={16} />}</button><button title={tr(language, "editSticker")} aria-label={`${tr(language, "editSticker")}: ${sticker.name}`} onClick={() => void stickerService.openEditor(sticker.id).catch((error) => onError(String(error)))}><MoreHorizontal size={18} /></button></div>
    <div className="library-card-actions"><button className={sticker.alwaysOnTop ? "on-top-chip active" : "on-top-chip"} title={tr(language, "onTopHint")} aria-pressed={sticker.alwaysOnTop} onClick={() => update({ alwaysOnTop: !sticker.alwaysOnTop })}>{sticker.alwaysOnTop ? <Pin size={13} /> : <PinOff size={13} />}{tr(language, sticker.alwaysOnTop ? "onTop" : "notOnTop")}</button></div>
  </article>;
}
