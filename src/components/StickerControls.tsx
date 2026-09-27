import { Eye, EyeOff, MousePointer2, Pin, SlidersHorizontal, Trash2 } from "lucide-react";
import type { Sticker } from "../types/sticker";

interface Props {
  sticker: Sticker;
  onToggle: (field: "visible" | "alwaysOnTop" | "clickThrough", value: boolean) => void;
  onOpacity: (value: number) => void;
  onDelete: () => void;
  onEdit: () => void;
}

export function StickerControls({ sticker, onToggle, onOpacity, onDelete, onEdit }: Props) {
  return (
    <div className="sticker-controls">
      <button className={sticker.visible ? "icon-button active" : "icon-button"} title={sticker.visible ? "Hide" : "Show"} onClick={() => onToggle("visible", !sticker.visible)}>
        {sticker.visible ? <Eye size={17} /> : <EyeOff size={17} />}
      </button>
      <button className={sticker.alwaysOnTop ? "icon-button active" : "icon-button"} title="Always on top" onClick={() => onToggle("alwaysOnTop", !sticker.alwaysOnTop)}>
        <Pin size={17} />
      </button>
      <button className={sticker.clickThrough ? "icon-button active" : "icon-button"} title="Click through" onClick={() => onToggle("clickThrough", !sticker.clickThrough)}>
        <MousePointer2 size={17} />
      </button>
      <button className="icon-button" title="Crop and remove background" onClick={onEdit}><SlidersHorizontal size={17} /></button>
      <label className="opacity-control" title={`Opacity ${Math.round(sticker.opacity * 100)}%`}>
        <span>{Math.round(sticker.opacity * 100)}%</span>
        <input type="range" min="10" max="100" value={Math.round(sticker.opacity * 100)} onChange={(event) => onOpacity(Number(event.target.value) / 100)} />
      </label>
      <button className="icon-button danger" title="Delete" onClick={onDelete}><Trash2 size={17} /></button>
    </div>
  );
}
