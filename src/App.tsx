import { LibraryPage } from "./pages/Library";
import { StickerWindow } from "./pages/StickerWindow";
import { EditorPage } from "./pages/Editor";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const stickerId = params.get("sticker");
  const editorId = params.get("editor");
  document.body.classList.toggle("sticker-body", !!stickerId);
  document.documentElement.classList.toggle("sticker-body", !!stickerId);
  document.body.classList.toggle("editor-body", !!editorId);
  document.documentElement.classList.toggle("editor-body", !!editorId);
  if (editorId) return <EditorPage id={editorId} />;
  return stickerId ? <StickerWindow id={stickerId} /> : <LibraryPage />;
}
