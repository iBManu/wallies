import { useEffect, useState, type FormEvent } from "react";
import { FolderPlus, X } from "lucide-react";
import { tr, type Language } from "../i18n";
import { stickerService } from "../services/stickerService";
import { EmojiPicker } from "./EmojiPicker";

const defaultEmojis = ["🦊", "🌟", "🐸", "👻", "🎮", "🍓", "🌈", "🍀", "🚀", "🐱", "🎨", "🦋"];

export function CreateCollectionDialog({ language, onClose, onCreated }: { language: Language; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(() => defaultEmojis[Math.floor(Math.random() * defaultEmojis.length)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const t = (key: Parameters<typeof tr>[1]) => tr(language, key);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [busy, onClose]);
  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true); setError("");
    try { const collection = await stickerService.createCollection(name.trim(), emoji); onCreated(collection.id); }
    catch (reason) { setError(String(reason)); setBusy(false); }
  };
  return <div className="add-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <form className="collection-dialog" role="dialog" aria-modal="true" aria-label={t("createCollection")} onSubmit={(event) => void create(event)}>
      <header><FolderPlus size={17} /><strong>{t("createCollection")}</strong><button type="button" title={t("cancel")} aria-label={t("cancel")} onClick={onClose}><X size={16} /></button></header>
      <div className="collection-identity"><EmojiPicker value={emoji} onChange={setEmoji} language={language} compact /><label className="collection-name-line"><input value={name} maxLength={60} onChange={(event) => setName(event.target.value)} placeholder={t("collectionName")} aria-label={t("collectionName")} autoFocus /></label></div>
      {error && <p className="add-error">{error}</p>}
      <footer><button type="button" onClick={onClose}>{t("cancel")}</button><button className="create-confirm" disabled={!name.trim() || busy}>{t("createCollection")}</button></footer>
    </form>
  </div>;
}
