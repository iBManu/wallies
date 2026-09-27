import { useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import stickerMark from "../assets/sticker-mark.png";
import { VisualCrop } from "../components/VisualCrop";
import { StickerRenderer } from "../components/StickerRenderer";
import { stickerService } from "../services/stickerService";
import { windowService } from "../services/windowService";
import type { Sticker } from "../types/sticker";
import { useSettings } from "../hooks/useSettings";
import { tr, type TranslationKey } from "../i18n";
import { stickerTransform } from "../services/stickerTransform";

export function EditorPage({ id }: { id: string }) {
  const [draft, setDraft] = useState<Sticker | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ width: 320, height: 123 });
  const { settings } = useSettings();
  const t = (key: TranslationKey) => tr(settings.language, key);
  useEffect(() => {
    void stickerService.list().then((snapshot) => setDraft(snapshot.stickers.find((item) => item.id === id) ?? null)).catch((reason) => setError(String(reason)));
    void stickerService.assetUrl(id).then(setUrl).catch((reason) => setError(String(reason)));
  }, [id]);
  const previewReady = Boolean(draft && url);
  useEffect(() => {
    if (!previewReady || !previewRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setPreviewSize({ width, height });
    });
    observer.observe(previewRef.current);
    return () => observer.disconnect();
  }, [previewReady]);
  const change = (patch: Partial<Sticker>) => setDraft((current) => current ? { ...current, ...patch } : current);
  const save = async () => {
    if (!draft || saving) return;
    setSaving(true); setError("");
    try {
      await stickerService.update(id, {
        name: draft.name.trim() || "Sticker", maintainAspectRatio: draft.maintainAspectRatio,
        pixelated: draft.pixelated,
        crop: draft.crop, chromaKey: draft.chromaKey, playbackSpeed: draft.playbackSpeed,
        opacity: draft.opacity, alwaysOnTop: draft.alwaysOnTop, clickThrough: draft.clickThrough,
        locked: draft.locked, rotation: draft.rotation,
        flipHorizontal: draft.flipHorizontal, flipVertical: draft.flipVertical,
      });
      await windowService.close();
    } catch (reason) { setError(String(reason)); setSaving(false); }
  };
  const remove = async () => {
    if (!draft || !confirm(`${t("confirmDelete")} “${draft.name}”`)) return;
    try { await stickerService.remove(id); await windowService.close(); } catch (reason) { setError(String(reason)); }
  };
  const gif = !!draft && /\.gif$/i.test(draft.source);
  const previewScale = draft ? Math.min(
    previewSize.width * .85 / Math.max(1, draft.width),
    previewSize.height * .85 / Math.max(1, draft.height),
  ) : 1;
  return <main className="mini-editor">
    <header className="mini-header" onMouseDown={(event) => { if (event.button === 0 && !(event.target as HTMLElement).closest("button")) void windowService.startDrag(); }}>
      <div className="mini-mark"><img src={stickerMark} alt="" /></div>
      <div className="mini-heading"><strong>{t("editSticker")}</strong></div>
      <button className="mini-close" title={t("closeWithoutSaving")} aria-label={t("closeWithoutSaving")} onClick={() => void windowService.close()}><X size={15} /></button>
    </header>
    {draft && url ? <>
      <div className="mini-preview-dock"><span className="section-label">{t("result")}</span><div className="preview-checker" ref={previewRef}><div className="preview-sticker" style={{ width: draft.width * previewScale, height: draft.height * previewScale, opacity: draft.opacity }}><StickerRenderer sticker={draft} url={url} style={{ transform: stickerTransform(draft) }} /></div></div></div>
      <div className="mini-scroll">
        <label className="editor-name"><span>{t("stickerName")}</span><input value={draft.name} maxLength={60} onChange={(event) => change({ name: event.target.value })} /></label>
        <section className="editor-group"><h2>{t("editorImage")}</h2>
          <span className="section-label">{t("cropDrag")}</span><VisualCrop url={url} crop={draft.crop} onChange={(crop) => change({ crop })} />
          <div className="setting-line"><div><strong>{t("removeBackground")}</strong><small>{t("removeBackgroundHint")}</small></div><input type="checkbox" checked={draft.chromaKey.enabled} onChange={(event) => change({ chromaKey: { ...draft.chromaKey, enabled: event.target.checked } })} /></div>
          {draft.chromaKey.enabled && <><div className="setting-line"><label htmlFor="key-color">{t("color")}</label><input id="key-color" type="color" value={draft.chromaKey.color} onChange={(event) => change({ chromaKey: { ...draft.chromaKey, color: event.target.value } })} /></div>
            <label className="slider-line">{t("tolerance")} <output>{draft.chromaKey.tolerance}%</output><input type="range" min="1" max="100" value={draft.chromaKey.tolerance} onChange={(event) => change({ chromaKey: { ...draft.chromaKey, tolerance: Number(event.target.value) } })} /></label></>}
          <label className="setting-line"><div><strong>{t("pixelated")}</strong><small>{t("pixelatedHint")}</small></div><input type="checkbox" checked={draft.pixelated} onChange={(event) => change({ pixelated: event.target.checked })} /></label>
          <label className="slider-line">{t("opacity")} <output>{Math.round(draft.opacity * 100)}%</output><input type="range" min="0.1" max="1" step="0.01" value={draft.opacity} onChange={(event) => change({ opacity: Number(event.target.value) })} /></label>
          {gif && <label className="slider-line">{t("gifSpeed")} <output>{draft.playbackSpeed.toFixed(2)}×</output><input type="range" min="0.25" max="3" step="0.05" value={draft.playbackSpeed} onChange={(event) => change({ playbackSpeed: Number(event.target.value) })} /></label>}
        </section>
        <section className="editor-group"><h2>{t("editorTransform")}</h2>
          <label className="slider-line">{t("rotation")} <output>{Math.round(draft.rotation)}°</output><input type="range" min="0" max="360" step="1" value={draft.rotation} onChange={(event) => change({ rotation: Number(event.target.value) })} /></label>
          <div className="setting-line"><label htmlFor="flip-horizontal">{t("flipHorizontal")}</label><input id="flip-horizontal" type="checkbox" checked={draft.flipHorizontal} onChange={(event) => change({ flipHorizontal: event.target.checked })} /></div>
          <div className="setting-line"><label htmlFor="flip-vertical">{t("flipVertical")}</label><input id="flip-vertical" type="checkbox" checked={draft.flipVertical} onChange={(event) => change({ flipVertical: event.target.checked })} /></div>
          <label className="setting-line"><div><strong>{t("maintainAspectRatio")}</strong><small>{t("maintainAspectHint")}</small></div><input type="checkbox" checked={draft.maintainAspectRatio} onChange={(event) => change({ maintainAspectRatio: event.target.checked })} /></label>
        </section>
        <section className="editor-group"><h2>{t("editorWindow")}</h2>
          <label className="setting-line"><div><strong>{t("onTop")}</strong><small>{t("onTopHint")}</small></div><input type="checkbox" checked={draft.alwaysOnTop} onChange={(event) => change({ alwaysOnTop: event.target.checked })} /></label>
          <label className="setting-line"><div><strong>{t("clickThrough")}</strong><small>{t("clickThroughHint")}</small></div><input type="checkbox" checked={draft.clickThrough} onChange={(event) => change({ clickThrough: event.target.checked })} /></label>
          <label className="setting-line"><div><strong>{t("lockPosition")}</strong></div><input type="checkbox" checked={draft.locked} onChange={(event) => change({ locked: event.target.checked })} /></label>
        </section>
        <button className="delete-link" onClick={() => void remove()}><Trash2 size={14} /> {t("deleteSticker")}</button>
      </div>
    </> : <div className="mini-loading">{error || t("loadingSticker")}</div>}
    {error && draft && <div className="mini-error">{error}</div>}
    <footer className="mini-footer"><button className="mini-cancel" onClick={() => void windowService.close()}>{t("cancel")}</button><button className="mini-save" disabled={!draft || saving} onClick={() => void save()}>{t(saving ? "saving" : "saveChanges")}</button></footer>
  </main>;
}
