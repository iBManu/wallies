import { getCurrentWindow } from "@tauri-apps/api/window";

const current = getCurrentWindow();

export const windowService = {
  startDrag: () => current.startDragging(),
  close: () => current.close(),
  hide: () => current.hide(),
  minimize: () => current.minimize(),
  toggleMaximize: () => current.toggleMaximize(),
};
