import { Eye, EyeOff, MoreHorizontal, Plus } from "lucide-react";
import { tr, type Language } from "../i18n";
import type { StickerCollection } from "../types/sticker";

interface Props {
  collection?: StickerCollection;
  count: number;
  expanded: boolean;
  dropTarget: boolean;
  language: Language;
  onOpen: () => void;
  onToggle?: () => void;
  onAdd?: () => void;
  onEdit?: () => void;
}

export function CollectionCard({ collection, count, expanded, dropTarget, language, onOpen, onToggle, onAdd, onEdit }: Props) {
  const name = collection?.name || tr(language, "noCollection");
  return <article className={`library-card folder-card${dropTarget ? " drop-target" : ""}${collection && !collection.enabled ? " folder-disabled" : ""}`} data-drop-collection-id={collection?.id || ""}>
    <button className="folder-open" aria-label={`${name}: ${expanded ? tr(language, "collapseCollection") : tr(language, "expandCollection")}`} aria-expanded={expanded} onClick={onOpen}>
      <div className="library-thumb folder-thumb"><span className="folder-emoji" aria-hidden="true">{collection?.emoji || "📁"}</span></div>
      <div className="library-card-info"><div className="library-card-title"><strong title={name}>{name}</strong><small>{count} {tr(language, count === 1 ? "stickerSingular" : "stickers")}</small></div></div>
    </button>
    <div className="library-card-actions folder-actions">
      {collection ? <><button className="folder-state" title={tr(language, collection.enabled ? "collectionOn" : "collectionOff")} aria-label={`${name}: ${tr(language, collection.enabled ? "collectionOn" : "collectionOff")}`} aria-pressed={collection.enabled} onClick={onToggle}>{collection.enabled ? <Eye size={14} /> : <EyeOff size={14} />}{tr(language, collection.enabled ? "collectionOn" : "collectionOff")}</button><button title={tr(language, "addToCollection")} aria-label={tr(language, "addToCollection")} onClick={onAdd}><Plus size={15} /></button><button title={tr(language, "editCollection")} aria-label={tr(language, "editCollection")} onClick={onEdit}><MoreHorizontal size={16} /></button></> : <span className="folder-drop-hint">{tr(language, "dropHere")}</span>}
    </div>
  </article>;
}
