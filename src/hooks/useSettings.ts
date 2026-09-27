import { useEffect, useState } from "react";
import { settingsService, type AppSettings } from "../services/settingsService";

const fallback: AppSettings = { language: "en", autostart: false, autostartSupported: true };

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(fallback);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const refresh = () => void settingsService.get().then((value) => { if (alive) { setSettings(value); setError(""); } }).catch((reason) => { if (alive) setError(String(reason)); });
    refresh();
    const unlisten = settingsService.onChanged(refresh);
    return () => { alive = false; void unlisten.then((stop) => stop()); };
  }, []);
  return { settings, error, setError };
}
