import { useCallback, useEffect, useState } from "react";
import { stickerService } from "../services/stickerService";
import type { StickerSnapshot } from "../types/sticker";

const empty: StickerSnapshot = { stickers: [], collections: [], editMode: false };

export function useStickerSnapshot() {
  const [snapshot, setSnapshot] = useState<StickerSnapshot>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSnapshot(await stickerService.list());
      setError(null);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const unlisten = stickerService.onChanged(() => void refresh());
    return () => void unlisten.then((fn) => fn());
  }, [refresh]);

  return { snapshot, loading, error, refresh };
}
