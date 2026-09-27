use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

use crate::{
    data_dir,
    models::{Sticker, StickerCollection, StickerPatch, StickerSnapshot},
    sticker_manager::{self, AppState},
    online::{self, GifSearchResult},
    settings::{self, SettingsSnapshot, SettingsState},
};

#[tauri::command]
pub fn list_stickers(state: State<'_, AppState>) -> Result<StickerSnapshot, String> {
    state.snapshot()
}

#[tauri::command]
pub async fn import_sticker(app: AppHandle, collection_id: Option<String>) -> Result<Option<Sticker>, String> {
    let (sender, receiver) = std::sync::mpsc::channel();
    app.dialog().file()
        .add_filter("Images and animated stickers", &["png", "jpg", "jpeg", "webp", "gif", "svg"])
        .pick_file(move |selection| {
            let _ = sender.send(selection);
        });

    let selection = tauri::async_runtime::spawn_blocking(move || receiver.recv())
        .await.map_err(|error| error.to_string())?
        .map_err(|error| error.to_string())?;
    let Some(selection) = selection else { return Ok(None); };
    let path = selection.into_path().map_err(|error| error.to_string())?;
    tauri::async_runtime::spawn_blocking(move || sticker_manager::import_from_path_named(&app, &path, None, collection_id.as_deref()))
        .await.map_err(|error| error.to_string())?
        .map(Some)
}

#[tauri::command]
pub async fn import_sticker_url(app: AppHandle, url: String, name: Option<String>, collection_id: Option<String>) -> Result<Sticker, String> {
    tauri::async_runtime::spawn_blocking(move || online::import_from_url(&app, &url, name.as_deref(), collection_id.as_deref()))
        .await.map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn import_sticker_bytes(app: AppHandle, bytes: Vec<u8>, name: String, collection_id: Option<String>) -> Result<Sticker, String> {
    tauri::async_runtime::spawn_blocking(move || online::import_image_bytes(&app, bytes, &name, collection_id.as_deref()))
        .await.map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn create_collection(app: AppHandle, name: String, emoji: String) -> Result<StickerCollection, String> {
    sticker_manager::create_collection(&app, name, emoji)
}

#[tauri::command]
pub fn update_collection(app: AppHandle, id: String, name: String, emoji: String) -> Result<StickerCollection, String> {
    sticker_manager::update_collection(&app, &id, name, emoji)
}

#[tauri::command]
pub fn set_collection_enabled(app: AppHandle, id: String, enabled: bool) -> Result<(), String> {
    sticker_manager::set_collection_enabled(&app, &id, enabled)
}

#[tauri::command]
pub fn delete_collection(app: AppHandle, id: String, delete_stickers: bool) -> Result<(), String> {
    sticker_manager::delete_collection(&app, &id, delete_stickers)
}

#[tauri::command]
pub async fn search_online_gifs(query: String, source: String) -> Result<Vec<GifSearchResult>, String> {
    tauri::async_runtime::spawn_blocking(move || online::search_gifs(&query, &source))
        .await.map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn update_sticker(app: AppHandle, id: String, patch: StickerPatch) -> Result<Sticker, String> {
    sticker_manager::update_sticker(&app, &id, patch)
}

#[tauri::command]
pub fn delete_sticker(app: AppHandle, id: String) -> Result<(), String> {
    sticker_manager::delete_sticker(&app, &id)
}

#[tauri::command]
pub fn set_edit_mode(app: AppHandle, enabled: bool) -> Result<(), String> {
    sticker_manager::set_edit_mode(&app, enabled)
}

#[tauri::command]
pub fn show_all_stickers(app: AppHandle) -> Result<(), String> {
    sticker_manager::set_all_visibility(&app, true)
}

#[tauri::command]
pub fn hide_all_stickers(app: AppHandle) -> Result<(), String> {
    sticker_manager::set_all_visibility(&app, false)
}

#[tauri::command]
pub fn sticker_asset_path(app: AppHandle, state: State<'_, AppState>, id: String) -> Result<String, String> {
    let path = state.asset_path(&id)?;
    app.asset_protocol_scope().allow_file(&path).map_err(|error| error.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn open_sticker_editor(app: AppHandle, id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || sticker_manager::open_sticker_editor(&app, &id))
        .await.map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn resize_sticker(app: AppHandle, id: String, width: u32, height: u32, x: i32, y: i32) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || sticker_manager::resize_sticker(&app, &id, width, height, x, y))
        .await.map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn get_settings(state: State<'_, SettingsState>) -> Result<SettingsSnapshot, String> {
    state.snapshot()
}

#[tauri::command]
pub fn set_language(app: AppHandle, state: State<'_, SettingsState>, language: String) -> Result<(), String> {
    state.set_language(&app, language)
}

#[tauri::command]
pub async fn set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || settings::set_autostart(&app, enabled))
        .await.map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn open_data_folder(app: AppHandle) -> Result<(), String> {
    let path = data_dir::path(&app)?;
    std::fs::create_dir_all(&path).map_err(|error| error.to_string())?;

    #[cfg(target_os = "windows")]
    let program = "explorer.exe";
    #[cfg(target_os = "macos")]
    let program = "open";
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    let program = "xdg-open";

    std::process::Command::new(program)
        .arg(&path)
        .spawn()
        .map_err(|error| format!("Could not open {}: {error}", path.display()))?;
    Ok(())
}

#[tauri::command]
pub fn open_credit_link(link: String) -> Result<(), String> {
    let url = match link.as_str() {
        "inter" => "https://github.com/rsms/inter",
        "license" => "https://openfontlicense.org/open-font-license-official-text/",
        "emoji" => "https://github.com/nolanlawson/emoji-picker-element",
        "repository" => "https://github.com/iBManu/wallies",
        _ => return Err("Unknown credit link".into()),
    };

    #[cfg(target_os = "windows")]
    let program = "explorer.exe";
    #[cfg(target_os = "macos")]
    let program = "open";
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    let program = "xdg-open";

    std::process::Command::new(program)
        .arg(url)
        .spawn()
        .map_err(|error| format!("Could not open credit link: {error}"))?;
    Ok(())
}
