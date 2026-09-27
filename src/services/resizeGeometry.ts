export type ResizeEdge = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
export interface Rectangle { x: number; y: number; width: number; height: number }

export function resizeRectangle(start: Rectangle, edge: ResizeEdge, dx: number, dy: number, keepRatio: boolean, sourceRatio: number): Rectangle {
  const east = edge.includes("e"), west = edge.includes("w"), north = edge.includes("n"), south = edge.includes("s");
  const ratio = Number.isFinite(sourceRatio) && sourceRatio > 0 ? sourceRatio : start.width / Math.max(1, start.height);
  let width = start.width + (east ? dx : west ? -dx : 0);
  let height = start.height + (south ? dy : north ? -dy : 0);
  if (keepRatio) {
    if ((east || west) && (north || south)) {
      if (Math.abs((width - start.width) / start.width) >= Math.abs((height - start.height) / start.height)) height = width / ratio;
      else width = height * ratio;
    } else if (east || west) height = width / ratio;
    else width = height * ratio;
    width = Math.max(width, 24, 24 * ratio);
    height = width / ratio;
  } else {
    width = Math.max(width, 24);
    height = Math.max(height, 24);
  }
  width = Math.round(width); height = Math.round(height);
  return {
    x: west ? start.x + start.width - width : start.x,
    y: north ? start.y + start.height - height : start.y,
    width, height,
  };
}
