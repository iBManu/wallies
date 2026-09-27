import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { FolderOpen, Globe2, Heart, MonitorUp } from "lucide-react";
import { tr, type Language } from "../i18n";
import { settingsService, type AppSettings } from "../services/settingsService";

export function SettingsPage({ settings, onError }: { settings: AppSettings; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState("");
  const language = settings.language;
  useEffect(() => { void getVersion().then(setVersion).catch(() => setVersion("")); }, []);
  const change = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); onError("");
    try { await task(); } catch (error) { onError(`${tr(language, "errorSaving")}: ${String(error)}`); }
    finally { setBusy(false); }
  };
  const openCreditLink = (link: "inter" | "license" | "emoji" | "repository") => {
    void settingsService.openCreditLink(link).catch((error) => onError(String(error)));
  };
  return <>
    <header className="library-header"><div><h1>{tr(language, "settings")}</h1></div></header>
    <div className="settings-content">
      <section className="settings-panel"><div className="settings-panel-heading"><Globe2 size={17} /><div><h2>{tr(language, "general")}</h2><p>{tr(language, "languageHint")}</p></div></div>
        <div className="settings-control"><label htmlFor="app-language">{tr(language, "language")}</label><select id="app-language" value={language} disabled={busy} onChange={(event) => void change(() => settingsService.setLanguage(event.target.value as Language))}><option value="en">English</option><option value="es">Español</option><option value="de">Deutsch</option><option value="zh">中文（简体）</option><option value="ja">日本語</option><option value="pt">Português</option><option value="it">Italiano</option><option value="fr">Français</option></select></div>
      </section>
      <section className="settings-panel"><div className="settings-panel-heading"><MonitorUp size={17} /><div><h2>{tr(language, "startup")}</h2><p>{tr(language, "startupHint")}</p></div></div>
        <label className="settings-control"><span>{tr(language, "startWithWindows")}{!settings.autostartSupported && <small>{tr(language, "startUnsupported")}</small>}</span><input type="checkbox" disabled={busy || !settings.autostartSupported} checked={settings.autostart} onChange={(event) => void change(() => settingsService.setAutostart(event.target.checked))} /></label>
      </section>
      <section className="settings-panel"><div className="settings-panel-heading"><FolderOpen size={17} /><div><h2>{tr(language, "data")}</h2><p>{tr(language, "dataHint")}</p></div></div>
        <div className="settings-control"><button className="settings-open-folder" type="button" onClick={() => void settingsService.openDataFolder().catch((error) => onError(String(error)))}>{tr(language, "openDataFolder")}</button></div>
      </section>
      <section className="settings-panel"><div className="settings-panel-heading"><Heart size={17} /><div><h2>{tr(language, "credits")}</h2></div></div>
        <div className="settings-credits">
          <p><button type="button" className="settings-credit-link" onClick={() => openCreditLink("inter")}>Inter</button> — {tr(language, "interCredit")} <button type="button" className="settings-credit-link" onClick={() => openCreditLink("license")}>SIL Open Font License 1.1</button>.</p>
          <p><button type="button" className="settings-credit-link" onClick={() => openCreditLink("emoji")}>emoji-picker-element</button> — {tr(language, "emojiPickerCredit")}.</p>
        </div>
      </section>
      <footer className="settings-meta">{version && <span>{tr(language, "version")} {version} · <button type="button" className="settings-credit-link" onClick={() => openCreditLink("repository")}>GitHub</button></span>}</footer>
    </div>
  </>;
}
