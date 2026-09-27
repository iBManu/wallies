import { useEffect, useRef, useState } from "react";
import type { CropSettings } from "../types/sticker";

type Edge = "move" | "nw" | "ne" | "sw" | "se";
interface Props { url: string; crop: CropSettings; onChange: (crop: CropSettings) => void }
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

export function VisualCrop({ url, crop, onChange }: Props) {
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [stage, setStage] = useState({ width: 300, height: 180 });
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ edge: Edge; x: number; y: number; crop: CropSettings; width: number; height: number } | null>(null);
  useEffect(() => {
    if (!stageRef.current) return;
    const observer = new ResizeObserver(([entry]) => setStage({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);
  const ratio = size.width / size.height;
  const width = Math.min(stage.width - 18, (stage.height - 18) * ratio);
  const height = width / ratio;
  const start = (event: React.PointerEvent<HTMLElement>, edge: Edge) => {
    event.preventDefault(); event.stopPropagation();
    dragRef.current = { edge, x: event.clientX, y: event.clientY, crop, width, height };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.x) / drag.width;
    const dy = (event.clientY - drag.y) / drag.height;
    const next = { ...drag.crop };
    if (drag.edge === "move") {
      next.left = clamp(drag.crop.left + dx, 0, drag.crop.left + drag.crop.right);
      next.right = drag.crop.right - (next.left - drag.crop.left);
      next.top = clamp(drag.crop.top + dy, 0, drag.crop.top + drag.crop.bottom);
      next.bottom = drag.crop.bottom - (next.top - drag.crop.top);
    } else {
      if (drag.edge.includes("w")) next.left = clamp(drag.crop.left + dx, 0, 0.92 - drag.crop.right);
      if (drag.edge.includes("e")) next.right = clamp(drag.crop.right - dx, 0, 0.92 - drag.crop.left);
      if (drag.edge.includes("n")) next.top = clamp(drag.crop.top + dy, 0, 0.92 - drag.crop.bottom);
      if (drag.edge.includes("s")) next.bottom = clamp(drag.crop.bottom - dy, 0, 0.92 - drag.crop.top);
    }
    onChange(next);
  };
  const stop = (event: React.PointerEvent<HTMLElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <div className="crop-stage" ref={stageRef} key={url}>
    <div className="crop-image" style={{ width, height }}>
      <img ref={imageRef} src={url} draggable={false} onLoad={(event) => setSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} alt="Original sticker" />
      <div className="crop-box" style={{ left: `${crop.left * 100}%`, top: `${crop.top * 100}%`, right: `${crop.right * 100}%`, bottom: `${crop.bottom * 100}%` }} onPointerDown={(event) => start(event, "move")} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
        {(["nw", "ne", "sw", "se"] as const).map((edge) => <span key={edge} className={`crop-handle ${edge}`} onPointerDown={(event) => start(event, edge)} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} />)}
      </div>
    </div>
  </div>;
}
