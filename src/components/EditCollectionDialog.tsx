import { useEffect, useState, type FormEvent } from "react";
import { MoreHorizontal, X } from "lucide-react";
import { tr, type Language } from "../i18n";
import { stickerService } from "../services/stickerService";
import type { StickerCollection } from "../types/sticker";
import { EmojiPicker } from "./EmojiPicker";

export function EditCollectionDialog({ collection, language, onClose }: { collection: StickerCollection; language: Language; onClose: () => void }) {
  const [name, setName] = useState(collection.name);
  const [emoji, setEmoji] = useState(collection.emoji || "📁");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const t = (key: Parameters<typeof tr>[1]) => tr(language, key);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [busy, onClose]);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || busy || confirmDelete) return;
    setBusy(true); setError("");
    try { await stickerService.updateCollection(collection.id, name.trim(), emoji); onClose(); }
    catch (reason) { setError(String(reason)); setBusy(false); }
  };
  const remove = async (deleteStickers: boolean) => {
    if (busy) return;
    setBusy(true); setError("");
    try { await stickerService.deleteCollection(collection.id, deleteStickers); onClose(); }
    catch (reason) { setError(String(reason)); setBusy(false); }
  };
  return <div className="add-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <form className="collection-dialog" role="dialog" aria-modal="true" aria-label={t("editCollection")} onSubmit={(event) => void save(event)}>
      <header><MoreHorizontal size={17} /><strong>{t("editCollection")}</strong><button type="button" title={t("cancel")} aria-label={t("cancel")} onClick={onClose}><X size={16} /></button></header>
      {confirmDelete ? <div className="collection-delete-choice"><strong>{t("deleteCollectionQuestion")}</strong><p>{t("confirmDeleteCollection")}</p></div> : <div className="collection-identity"><EmojiPicker value={emoji} onChange={setEmoji} language={language} compact /><label className="collection-name-line"><input value={name} maxLength={60} onChange={(event) => setName(event.target.value)} placeholder={t("collectionName")} aria-label={t("collectionName")} autoFocus /></label></div>}
      {error && <p className="add-error">{error}</p>}
      {confirmDelete ? <footer className="collection-delete-actions"><button type="button" disabled={busy} onClick={() => setConfirmDelete(false)}>{t("cancel")}</button><button type="button" disabled={busy} onClick={() => void remove(false)}>{t("deleteCollectionOnly")}</button><button type="button" className="delete-with-stickers" disabled={busy} onClick={() => void remove(true)}>{t("deleteCollectionWithStickers")}</button></footer>
        : <footer className="collection-edit-footer"><button type="button" className="collection-delete" disabled={busy} onClick={() => setConfirmDelete(true)}>{t("deleteCollection")}</button><button type="button" onClick={onClose}>{t("cancel")}</button><button className="create-confirm" disabled={!name.trim() || busy}>{t("saveChanges")}</button></footer>}
    </form>
  </div>;
}
