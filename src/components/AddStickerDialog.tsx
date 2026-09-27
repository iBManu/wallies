import { useEffect, useState } from "react";
import { ArrowLeft, FileImage, Link2, Search, X } from "lucide-react";
import { tr, type Language } from "../i18n";
import { stickerService, type GifSource, type OnlineGif } from "../services/stickerService";

type Mode = "choices" | "url" | "search";

export function AddStickerDialog({ language, initialCollectionId, onClose }: { language: Language; initialCollectionId?: string; onClose: () => void }) {
  const collectionId = initialCollectionId;
  const [mode, setMode] = useState<Mode>("choices");
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OnlineGif[]>([]);
  const [source, setSource] = useState<GifSource>("all");
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const t = (key: Parameters<typeof tr>[1]) => tr(language, key);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [busy, onClose]);

  const run = async (task: () => Promise<unknown>, closeOnSuccess = false) => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await task();
      if (closeOnSuccess && result) onClose();
    } catch (reason) { setError(`${t("onlineError")}: ${String(reason)}`); }
    finally { setBusy(false); }
  };
  const search = (selected: GifSource = source) => void run(async () => {
    const found = await Promise.race([
      stickerService.searchGifs(query.trim(), selected),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(t("searchTimeout"))), 12000)),
    ]);
    setResults(found); setSearched(true);
  });
  const chooseSource = (selected: GifSource) => {
    if (selected === source || busy) return;
    setSource(selected); setResults([]); setSearched(false);
    if (query.trim()) search(selected);
  };

  return <div className="add-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className="add-dialog" role="dialog" aria-modal="true" aria-label={t("addSource")}>
      <header className="add-dialog-header">
        {mode !== "choices" && <button className="add-back" aria-label={t("back")} onClick={() => { setMode("choices"); setError(""); }}><ArrowLeft size={17} /></button>}
        <strong>{mode === "choices" ? t("addSource") : mode === "url" ? t("fromUrl") : t("searchGifs")}</strong>
        <button className="add-close" aria-label={t("cancel")} onClick={onClose}><X size={17} /></button>
      </header>
      {mode === "choices" && <div className="add-choices">
        <button disabled={busy} onClick={() => void run(() => stickerService.import(collectionId), true)}><FileImage size={21} /><span><strong>{t("fromComputer")}</strong><small>PNG · GIF · WEBP · JPG · SVG</small></span></button>
        <button disabled={busy} onClick={() => setMode("url")}><Link2 size={21} /><span><strong>{t("fromUrl")}</strong><small>https://…/sticker.gif</small></span></button>
        <button disabled={busy} onClick={() => setMode("search")}><Search size={21} /><span><strong>{t("searchGifs")}</strong><small>GifCities · Wikimedia Commons</small></span></button>
      </div>}
      {mode === "url" && <form className="add-form" onSubmit={(event) => { event.preventDefault(); void run(() => stickerService.importUrl(url.trim(), undefined, collectionId), true); }}>
        <p>{t("urlHint")}</p><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder={t("urlPlaceholder")} required autoFocus />
        <button className="add-submit" disabled={busy || !url.trim()}>{busy ? t("importingGif") : t("importUrl")}</button>
      </form>}
      {mode === "search" && <div className="add-search">
        <form onSubmit={(event) => { event.preventDefault(); search(); }}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} maxLength={80} autoFocus /><button disabled={busy || !query.trim()}><Search size={15} />{busy && !searched ? t("searching") : t("searchAction")}</button></form>
        <div className="source-tabs" role="tablist" aria-label={t("gifSource")}>{(["all", "gifcities", "commons"] as const).map((item) => <button key={item} role="tab" aria-selected={source === item} className={source === item ? "active" : ""} disabled={busy} onClick={() => chooseSource(item)}>{t(item === "all" ? "allSources" : item === "gifcities" ? "gifCities" : "wikimediaCommons")}</button>)}</div>
        <div className="add-results">{results.length ? results.map((item, index) => <button key={item.id} disabled={busy} title={item.title} onClick={() => void run(() => stickerService.importUrl(item.url, item.title || `${query.trim()} ${index + 1}`, collectionId), true)}><img src={item.url} alt={item.title} loading="lazy" /><span className="result-source">{item.source === "gifcities" ? "GifCities" : "Commons"}</span><span>{item.width} × {item.height}</span></button>) : searched && !busy ? <p>{t("noResults")}</p> : null}</div>
        <div className="source-credits"><a href="https://gifcities.org/" target="_blank" rel="noreferrer">GifCities · Internet Archive</a><a href="https://commons.wikimedia.org/" target="_blank" rel="noreferrer">Wikimedia Commons</a></div>
      </div>}
      {error && <p className="add-error">{error}</p>}
    </section>
  </div>;
}
