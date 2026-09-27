import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import de from "emoji-picker-element/i18n/de";
import es from "emoji-picker-element/i18n/es";
import fr from "emoji-picker-element/i18n/fr";
import it from "emoji-picker-element/i18n/it";
import ja from "emoji-picker-element/i18n/ja";
import pt from "emoji-picker-element/i18n/pt_PT";
import zh from "emoji-picker-element/i18n/zh_CN";
import enData from "emoji-picker-element-data/en/emojibase/data.json?url";
import esData from "emoji-picker-element-data/es/cldr/data.json?url";
import deData from "emoji-picker-element-data/de/cldr/data.json?url";
import zhData from "emoji-picker-element-data/zh/emojibase/data.json?url";
import jaData from "emoji-picker-element-data/ja/emojibase/data.json?url";
import ptData from "emoji-picker-element-data/pt/cldr/data.json?url";
import itData from "emoji-picker-element-data/it/cldr/data.json?url";
import frData from "emoji-picker-element-data/fr/emojibase/data.json?url";
import { tr, type Language } from "../i18n";

const dataSources: Record<Language, string> = { en: enData, es: esData, de: deData, zh: zhData, ja: jaData, pt: ptData, it: itData, fr: frData };
const translations = { es, de, zh, ja, pt, it, fr };

function pickerPlacement(trigger: HTMLElement | null): CSSProperties {
  if (!trigger) return {};
  const bounds = trigger.getBoundingClientRect();
  const margin = 10;
  const gap = 6;
  const above = Math.max(0, bounds.top - gap - margin);
  const below = Math.max(0, window.innerHeight - bounds.bottom - gap - margin);
  const openBelow = below >= 270 || below > above;
  const available = openBelow ? below : above;
  const height = Math.min(270, available);
  const width = Math.min(310, window.innerWidth - margin * 2);
  return {
    top: openBelow ? bounds.bottom + gap : bounds.top - gap - height,
    left: Math.max(margin, Math.min(bounds.left, window.innerWidth - width - margin)),
    width,
    height,
  };
}

export function EmojiPicker({ value, onChange, language, compact = false }: { value: string; onChange: (emoji: string) => void; language: Language; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<CSSProperties>({});
  const root = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const reposition = () => setPlacement(pickerPlacement(root.current));
    document.addEventListener("pointerdown", close);
    window.addEventListener("resize", reposition);
    document.addEventListener("scroll", reposition, true);
    return () => { document.removeEventListener("pointerdown", close); window.removeEventListener("resize", reposition); document.removeEventListener("scroll", reposition, true); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let picker: HTMLElement | undefined;
    const load = async () => {
      const { default: Picker } = await import("emoji-picker-element/picker");
      if (cancelled || !mount.current) return;
      const i18n = language === "en" ? undefined : translations[language];
      const element = new Picker({ locale: language, dataSource: dataSources[language], i18n });
      picker = element;
      element.classList.add("light");
      element.addEventListener("emoji-click", (event) => {
        if (event.detail.unicode) { onChange(event.detail.unicode); setOpen(false); }
      });
      mount.current.appendChild(element);
    };
    void load();
    return () => { cancelled = true; picker?.remove(); };
  }, [open, language, onChange]);

  return <div className={compact ? "emoji-picker compact" : "emoji-picker"} ref={root}>
    <button type="button" className="emoji-trigger" aria-label={tr(language, "collectionEmoji")} aria-expanded={open} onClick={() => { if (!open) setPlacement(pickerPlacement(root.current)); setOpen(!open); }}><span>{value}</span>{!compact && <ChevronDown size={14} />}</button>
    {open && <div className="emoji-popover" ref={mount} style={placement} role="group" aria-label={tr(language, "collectionEmoji")} />}
  </div>;
}
