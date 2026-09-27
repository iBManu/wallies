import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Language } from "../i18n";

export interface AppSettings {
  language: Language;
  autostart: boolean;
  autostartSupported: boolean;
}

export const settingsService = {
  get: () => invoke<AppSettings>("get_settings"),
  setLanguage: (language: Language) => invoke<void>("set_language", { language }),
  setAutostart: (enabled: boolean) => invoke<void>("set_autostart", { enabled }),
  openDataFolder: () => invoke<void>("open_data_folder"),
  openCreditLink: (link: "inter" | "license" | "emoji" | "repository") => invoke<void>("open_credit_link", { link }),
  onChanged: (callback: () => void) => listen("settings://changed", callback),
};
