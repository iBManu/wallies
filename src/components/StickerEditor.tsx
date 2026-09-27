import { Pipette, Scissors, X } from "lucide-react";
import { StickerRenderer } from "./StickerRenderer";
import type { CropSettings, Sticker } from "../types/sticker";

interface Props {
  sticker: Sticker;
  url: string;
  onChange: (sticker: Sticker) => void;
  onSave: () => void;
  onClose: () => void;
}

const cropLabels: Array<[keyof CropSettings, string]> = [
  ["top", "Top"], ["right", "Right"], ["bottom", "Bottom"], ["left", "Left"],
];

export function StickerEditor({ sticker, url, onChange, onSave, onClose }: Props) {
  const setCrop = (field: keyof CropSettings, value: number) => {
    const crop = { ...sticker.crop, [field]: value };
    if (crop.left + crop.right > .9 || crop.top + crop.bottom > .9) return;
    onChange({ ...sticker, crop });
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="editor-modal">
        <header><div><span className="eyebrow">NON-DESTRUCTIVE EDITOR</span><h2>Edit {sticker.name}</h2></div><button className="modal-close" onClick={onClose}><X size={19} /></button></header>
        <div className="editor-body">
          <div className="editor-preview"><StickerRenderer sticker={sticker} url={url} /></div>
          <div className="editor-settings">
            <div className="setting-group">
              <h3><Scissors size={17} /> Crop</h3>
              <p>Hide the unwanted edges. The original file remains untouched.</p>
              {cropLabels.map(([field, label]) => <label className="range-row" key={field}><span>{label}</span><input type="range" min="0" max="45" value={Math.round(sticker.crop[field] * 100)} onChange={(event) => setCrop(field, Number(event.target.value) / 100)} /><output>{Math.round(sticker.crop[field] * 100)}%</output></label>)}
              <button className="text-button" onClick={() => onChange({ ...sticker, crop: { top: 0, right: 0, bottom: 0, left: 0 } })}>Reset crop</button>
            </div>
            <div className="setting-group">
              <h3><Pipette size={17} /> Remove background color</h3>
              <p>Ideal for green-screen GIFs. Increase tolerance to remove color variations.</p>
              <label className="switch-row"><span>Enable color key</span><input type="checkbox" checked={sticker.chromaKey.enabled} onChange={(event) => onChange({ ...sticker, chromaKey: { ...sticker.chromaKey, enabled: event.target.checked } })} /></label>
              <label className="color-row"><span>Background color</span><input type="color" value={sticker.chromaKey.color} onChange={(event) => onChange({ ...sticker, chromaKey: { ...sticker.chromaKey, color: event.target.value } })} /></label>
              <label className="range-row"><span>Tolerance</span><input type="range" min="1" max="100" value={sticker.chromaKey.tolerance} onChange={(event) => onChange({ ...sticker, chromaKey: { ...sticker.chromaKey, tolerance: Number(event.target.value) } })} /><output>{sticker.chromaKey.tolerance}</output></label>
            </div>
          </div>
        </div>
        <footer><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={onSave}>Save changes</button></footer>
      </section>
    </div>
  );
}
