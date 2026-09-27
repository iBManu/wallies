import { useEffect, useState, type DragEvent } from "react";
import { Eye, EyeOff, FolderPlus, ImagePlus, Maximize2, Minus, MousePointer2, Settings, Smile, X } from "lucide-react";
import stickerMark from "../assets/sticker-mark.png";
import { AddStickerDialog } from "../components/AddStickerDialog";
import { CollectionCard } from "../components/CollectionCard";
import { CreateCollectionDialog } from "../components/CreateCollectionDialog";
import { EditCollectionDialog } from "../components/EditCollectionDialog";
import { StickerCard } from "../components/StickerCard";
import { useSettings } from "../hooks/useSettings";
import { useStickerSnapshot } from "../hooks/useStickerSnapshot";
import { tr, type TranslationKey } from "../i18n";
import { stickerService } from "../services/stickerService";
import { windowService } from "../services/windowService";
import type { Sticker, StickerCollection } from "../types/sticker";
import { SettingsPage } from "./Settings";

type Page = "library" | "settings";
const currentPage = (): Page => window.location.hash === "#settings" ? "settings" : "library";

function droppedUrl(transfer: DataTransfer): string | null {
  const uri = transfer.getData("text/uri-list").split(/\r?\n/).find((line) => line && !line.startsWith("#"));
  const plain = transfer.getData("text/plain").trim();
  const html = transfer.getData("text/html");
  const parsedHtml = html ? new DOMParser().parseFromString(html, "text/html") : null;
  const candidates = [uri, parsedHtml?.querySelector("img")?.getAttribute("src"), plain, parsedHtml?.querySelector("a")?.getAttribute("href")];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try { const url = new URL(candidate.trim()); if (url.protocol === "https:") return url.href; } catch { /* Try the next representation. */ }
  }
  return null;
}

export function LibraryPage() {
  const { snapshot, loading, error } = useStickerSnapshot();
  const { settings, error: settingsError } = useSettings();
  const [page, setPage] = useState<Page>(currentPage);
  const [addOpen, setAddOpen] = useState(window.location.hash === "#add");
  const [addCollectionId, setAddCollectionId] = useState<string | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [editCollection, setEditCollection] = useState<StickerCollection | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragStickerId, setDragStickerId] = useState<string | null>(null);
  const [hoverCollectionId, setHoverCollectionId] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [dropBusy, setDropBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  const language = settings.language;
  const t = (key: TranslationKey) => tr(language, key);

  useEffect(() => {
    const update = () => { setPage(currentPage()); setAddOpen(window.location.hash === "#add"); };
    window.addEventListener("hashchange", update);
    const unlisten = stickerService.onError(setLocalError);
    return () => { window.removeEventListener("hashchange", update); void unlisten.then((stop) => stop()); };
  }, []);

  const navigate = (next: Page) => { window.location.hash = next; setPage(next); setAddOpen(false); };
  const openAdd = (collectionId?: string) => { setAddCollectionId(collectionId); window.location.hash = "add"; setAddOpen(true); };
  const closeAdd = () => { window.location.hash = "library"; setAddOpen(false); setAddCollectionId(undefined); };
  const action = (task: Promise<unknown>) => void task.catch((reason) => setLocalError(String(reason)));
  const toggleExpanded = (id: string) => setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const resetDrag = () => { setDragStickerId(null); setHoverCollectionId(null); setDropActive(false); };
  const hoveredId = (target: EventTarget) => (target as HTMLElement).closest<HTMLElement>("[data-drop-collection-id]")?.dataset.dropCollectionId ?? null;
  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const internal = dragStickerId !== null || event.dataTransfer.types.includes("application/x-desktop-sticker-id");
    event.dataTransfer.dropEffect = internal ? "move" : "copy";
    setHoverCollectionId(hoveredId(event.target));
    setDropActive(!internal);
  };
  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); event.stopPropagation();
    const collectionId = hoveredId(event.target) ?? "";
    const internalId = event.dataTransfer.getData("application/x-desktop-sticker-id") || event.dataTransfer.getData("text/plain").match(/^desktop-sticker:([\w-]+)$/)?.[1] || dragStickerId;
    resetDrag();
    if (internalId && snapshot.stickers.some((sticker) => sticker.id === internalId)) { action(stickerService.update(internalId, { collectionId })); return; }
    if (dropBusy) return;
    const files = Array.from(event.dataTransfer.files);
    const url = droppedUrl(event.dataTransfer);
    const preferGifUrl = !!url && /\.gif(?:$|[?#])/i.test(url);
    setDropBusy(true); setLocalError("");
    try {
      if (url && (preferGifUrl || !files.length)) await stickerService.importUrl(url, undefined, collectionId || undefined);
      else if (files.length) {
        for (const file of files) await stickerService.importBytes(Array.from(new Uint8Array(await file.arrayBuffer())), file.name, collectionId || undefined);
      } else setLocalError(t("unsupportedDrop"));
    } catch (reason) { setLocalError(`${t("couldNotAdd")}: ${String(reason)}`); }
    finally { setDropBusy(false); }
  };
  const renderSticker = (sticker: Sticker) => <StickerCard key={sticker.id} sticker={sticker} language={language} onError={setLocalError} onDragStart={setDragStickerId} onDragEnd={resetDrag} />;
  const ungrouped = snapshot.stickers.filter((sticker) => !sticker.collectionId);
  const anyVisible = snapshot.stickers.some((sticker) => sticker.visible && (!sticker.collectionId || snapshot.collections.find((collection) => collection.id === sticker.collectionId)?.enabled));

  return <div className="app-frame" onDragOver={onDragOver} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) { setHoverCollectionId(null); setDropActive(false); } }} onDrop={(event) => void handleDrop(event)}>
    <header className="app-titlebar" onMouseDown={(event) => { if (event.button === 0 && !(event.target as HTMLElement).closest("button")) void windowService.startDrag(); }}>
      <span className="titlebar-icon"><img src={stickerMark} alt="" /></span><span className="titlebar-name">Wallies</span>
      <div className="titlebar-actions"><button title={t("hideToTray")} aria-label={t("hideToTray")} onClick={() => action(windowService.hide())}><Minus size={15} /></button><button title={t("maximize")} aria-label={t("maximize")} onClick={() => action(windowService.toggleMaximize())}><Maximize2 size={13} /></button><button className="close" title={t("hideToTray")} aria-label={t("hideToTray")} onClick={() => action(windowService.hide())}><X size={15} /></button></div>
    </header>
    <main className="library-shell">
      <aside className="library-rail">
        <button className={page === "library" ? "rail-action active" : "rail-action"} title={t("stickers")} aria-label={t("stickers")} onClick={() => navigate("library")}><Smile size={19} /></button>
        <div className="rail-spacer" /><button className={page === "settings" ? "rail-action active" : "rail-action"} title={t("settings")} aria-label={t("settings")} onClick={() => navigate("settings")}><Settings size={19} /></button>
      </aside>
      <section className="library-main">
        {page === "settings" ? <SettingsPage settings={settings} onError={setLocalError} /> : <>
          <header className="library-header"><h1>{t("stickers")}</h1><div className="library-header-actions"><button className="new-collection-button" onClick={() => setCreateOpen(true)}><FolderPlus size={16} />{t("createCollection")}</button><button className="add-button" onClick={() => openAdd()}><ImagePlus size={17} />{t("addSticker")}</button></div></header>
          <div className="library-toolbar"><div className="toolbar-actions"><button disabled={snapshot.stickers.length === 0} title={t(anyVisible ? "hide" : "show")} onClick={() => action(anyVisible ? stickerService.hideAll() : stickerService.showAll())}>{anyVisible ? <EyeOff size={16} /> : <Eye size={16} />} {t(anyVisible ? "hide" : "show")}</button><button className={snapshot.editMode ? "mode-button on" : "mode-button"} disabled={snapshot.stickers.length === 0} onClick={() => action(stickerService.setEditMode(!snapshot.editMode))}><MousePointer2 size={16} /> {t(snapshot.editMode ? "finishEditing" : "editMode")}</button></div><span className="toolbar-count">{snapshot.stickers.length} {t("collection")}</span></div>
        </>}
        {(error || settingsError || localError) && <div className="library-error">{error || settingsError || localError}</div>}
        {page === "library" && <div className="library-content">{loading ? <div className="library-placeholder">{t("loading")}</div> : snapshot.stickers.length === 0 && snapshot.collections.length === 0 ? <div className="library-empty"><div className="empty-symbol"><ImagePlus size={26} /></div><h2>{t("emptyTitle")}</h2><p>{t("emptyDescription")}</p><button className="add-button" onClick={() => openAdd()}><ImagePlus size={16} /> {t("addSticker")}</button></div> : <div className="library-grid library-items">
          {ungrouped.map(renderSticker)}
          {snapshot.collections.map((collection) => <div key={collection.id} className={`collection-strip${expanded.has(collection.id) ? " expanded" : ""}${hoverCollectionId === collection.id ? " drop-target" : ""}`} data-drop-collection-id={collection.id}><CollectionCard collection={collection} count={snapshot.stickers.filter((sticker) => sticker.collectionId === collection.id).length} expanded={expanded.has(collection.id)} dropTarget={false} language={language} onOpen={() => toggleExpanded(collection.id)} onToggle={() => action(stickerService.setCollectionEnabled(collection.id, !collection.enabled))} onAdd={() => openAdd(collection.id)} onEdit={() => setEditCollection(collection)} />{expanded.has(collection.id) && snapshot.stickers.filter((sticker) => sticker.collectionId === collection.id).map(renderSticker)}</div>)}
        </div>}</div>}
      </section>
    </main>
    {dropActive && <div className="drop-overlay"><ImagePlus size={27} /><span>{t("dropToAdd")}</span></div>}
    {addOpen && <AddStickerDialog language={language} initialCollectionId={addCollectionId} onClose={closeAdd} />}
    {createOpen && <CreateCollectionDialog language={language} onClose={() => setCreateOpen(false)} onCreated={(id) => { setCreateOpen(false); setExpanded((current) => new Set(current).add(id)); }} />}
    {editCollection && <EditCollectionDialog collection={editCollection} language={language} onClose={() => setEditCollection(null)} />}
  </div>;
}
