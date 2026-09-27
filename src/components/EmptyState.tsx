import { ImagePlus } from "lucide-react";

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><ImagePlus size={28} /></div>
      <h2>Your desktop is a blank canvas</h2>
      <p>Add a PNG, JPEG, WEBP, GIF or SVG. The file is copied into the app data folder.</p>
      <button className="primary-button" onClick={onAdd}><ImagePlus size={18} /> Add your first sticker</button>
    </div>
  );
}
