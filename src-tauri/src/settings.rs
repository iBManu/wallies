use std::{fs, path::PathBuf, sync::Mutex};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

use crate::{autostart, data_dir, tray};

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsData {
    #[serde(default = "default_language")]
    pub language: String,
}

fn default_language() -> String { "en".into() }

impl Default for SettingsData {
    fn default() -> Self { Self { language: default_language() } }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsSnapshot {
    pub language: String,
    pub autostart: bool,
    pub autostart_supported: bool,
}

pub struct SettingsState {
    path: PathBuf,
    data: Mutex<SettingsData>,
}

impl SettingsState {
    pub fn load(app: &AppHandle) -> Result<Self, String> {
        let path = data_dir::path(app)?.join("settings.json");
        let data = if path.exists() {
            serde_json::from_slice(&fs::read(&path).map_err(|error| error.to_string())?).unwrap_or_default()
        } else { SettingsData::default() };
        Ok(Self { path, data: Mutex::new(data) })
    }

    pub fn language(&self) -> Result<String, String> {
        Ok(self.data.lock().map_err(|_| "Settings are unavailable")?.language.clone())
    }

    pub fn snapshot(&self) -> Result<SettingsSnapshot, String> {
        let data = self.data.lock().map_err(|_| "Settings are unavailable")?.clone();
        Ok(SettingsSnapshot {
            language: data.language,
            autostart: autostart::is_enabled()?,
            autostart_supported: cfg!(windows),
        })
    }

    fn save(&self) -> Result<(), String> {
        let data = self.data.lock().map_err(|_| "Settings are unavailable")?.clone();
        fs::write(&self.path, serde_json::to_vec_pretty(&data).map_err(|error| error.to_string())?)
            .map_err(|error| error.to_string())
    }

    pub fn set_language(&self, app: &AppHandle, language: String) -> Result<(), String> {
        if !matches!(language.as_str(), "es" | "en" | "de" | "zh" | "ja" | "pt" | "it" | "fr") { return Err("Unsupported language".into()); }
        self.data.lock().map_err(|_| "Settings are unavailable")?.language = language.clone();
        self.save()?;
        tray::apply_language(app, &language).map_err(|error| error.to_string())?;
        let _ = app.emit("settings://changed", ());
        Ok(())
    }

}

pub fn set_autostart(app: &AppHandle, enabled: bool) -> Result<(), String> {
    autostart::set_enabled(enabled)?;
    let _ = app.emit("settings://changed", ());
    Ok(())
}
