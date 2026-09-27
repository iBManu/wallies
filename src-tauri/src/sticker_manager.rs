use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, Position, Size,
    WebviewUrl, WebviewWindowBuilder, WindowEvent,
};
use uuid::Uuid;

use crate::{
    data_dir,
    models::{ChromaKeySettings, CropSettings, PersistedData, Sticker, StickerCollection, StickerPatch, StickerSnapshot},
    platform,
};

pub const STICKER_LABEL_PREFIX: &str = "sticker-";

pub struct AppState {
    data: Mutex<PersistedData>,
    edit_mode: Mutex<bool>,
    app_data_dir: PathBuf,
}

impl AppState {
    pub fn load(app: &AppHandle) -> Result<Self, String> {
        let app_data_dir = data_dir::path(app)?;
        fs::create_dir_all(app_data_dir.join("stickers")).map_err(|error| error.to_string())?;
        let data_path = app_data_dir.join("stickers.json");
        let data = if data_path.exists() {
            serde_json::from_slice(&fs::read(&data_path).map_err(|error| error.to_string())?)
                .unwrap_or_default()
        } else {
            PersistedData::default()
        };

        Ok(Self { data: Mutex::new(data), edit_mode: Mutex::new(false), app_data_dir })
    }

    pub fn snapshot(&self) -> Result<StickerSnapshot, String> {
        let data = self.data.lock().map_err(|_| "Sticker state is unavailable")?;
        Ok(StickerSnapshot {
            stickers: data.stickers.clone(),
            collections: data.collections.clone(),
            edit_mode: *self.edit_mode.lock().map_err(|_| "Edit state is unavailable")?,
        })
    }

    pub fn sticker(&self, id: &str) -> Result<Sticker, String> {
        self.data
            .lock().map_err(|_| "Sticker state is unavailable")?
            .stickers.iter().find(|sticker| sticker.id == id).cloned()
            .ok_or_else(|| format!("Sticker {id} was not found"))
    }

    pub fn asset_path(&self, id: &str) -> Result<PathBuf, String> {
        let sticker = self.sticker(id)?;
        Ok(self.app_data_dir.join("stickers").join(sticker.source))
    }

    fn save(&self) -> Result<(), String> {
        let json = serde_json::to_vec_pretty(&*self.data.lock().map_err(|_| "Sticker state is unavailable")?)
            .map_err(|error| error.to_string())?;
        fs::write(self.app_data_dir.join("stickers.json"), json).map_err(|error| error.to_string())
    }
}

pub fn restore_windows(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    for sticker in state.snapshot()?.stickers {
        apply_window_state(app, &sticker)?;
    }
    Ok(())
}

pub fn import_from_path_named(app: &AppHandle, source_path: &Path, display_name: Option<&str>, collection_id: Option<&str>) -> Result<Sticker, String> {
    let extension = source_path.extension().and_then(|value| value.to_str()).unwrap_or("").to_ascii_lowercase();
    if !matches!(extension.as_str(), "png" | "jpg" | "jpeg" | "webp" | "gif" | "svg") {
        return Err("Supported formats: PNG, JPEG, WEBP, GIF and SVG".into());
    }

    let state = app.state::<AppState>();
    if let Some(collection_id) = collection_id {
        if !state.data.lock().map_err(|_| "Sticker state is unavailable")?.collections.iter().any(|collection| collection.id == collection_id) {
            return Err("Collection not found".into());
        }
    }
    let id = Uuid::new_v4().to_string();
    let stored_name = format!("{id}.{extension}");
    let destination = state.app_data_dir.join("stickers").join(&stored_name);
    fs::copy(source_path, &destination).map_err(|error| format!("Could not copy sticker: {error}"))?;
    app.asset_protocol_scope().allow_file(&destination).map_err(|error| error.to_string())?;

    let (image_width, image_height) = image::image_dimensions(&destination).unwrap_or((300, 300));
    let max_side = 300.0;
    let scale = (max_side / image_width.max(image_height) as f64).min(1.0);
    let width = ((image_width as f64 * scale).round() as u32).max(96);
    let height = ((image_height as f64 * scale).round() as u32).max(96);
    let offset = state.snapshot()?.stickers.len() as i32 * 28;

    let sticker = Sticker {
        id,
        name: display_name.unwrap_or_else(|| source_path.file_stem().and_then(|value| value.to_str()).unwrap_or("Sticker")).to_string(),
        source: stored_name,
        x: 80 + offset,
        y: 80 + offset,
        width,
        height,
        opacity: 1.0,
        always_on_top: false,
        click_through: true,
        locked: false,
        visible: true,
        collection_id: collection_id.map(str::to_owned),
        rotation: 0.0,
        flip_horizontal: false,
        flip_vertical: false,
        playback_speed: 1.0,
        aspect_ratio: Some(image_width.max(1) as f64 / image_height.max(1) as f64),
        maintain_aspect_ratio: true,
        pixelated: image_width <= 64 && image_height <= 64,
        crop: CropSettings::default(),
        chroma_key: ChromaKeySettings::default(),
        monitor_id: None,
        created_at: SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64,
    };

    state.data.lock().map_err(|_| "Sticker state is unavailable")?.stickers.push(sticker.clone());
    if let Err(error) = state.save().and_then(|_| create_sticker_window(app, &sticker)) {
        if let Ok(mut data) = state.data.lock() {
            data.stickers.retain(|item| item.id != sticker.id);
        }
        let _ = state.save();
        let _ = fs::remove_file(&destination);
        return Err(error);
    }
    notify_changed(app);
    Ok(sticker)
}

pub fn create_sticker_window(app: &AppHandle, sticker: &Sticker) -> Result<(), String> {
    let label = format!("{STICKER_LABEL_PREFIX}{}", sticker.id);
    if app.get_webview_window(&label).is_some() { return Ok(()); }
    if !effective_visibility(app, sticker)? { return Ok(()); }

    let edit_mode = *app.state::<AppState>().edit_mode.lock().map_err(|_| "Edit state is unavailable")?;
    let url = WebviewUrl::App(format!("index.html?sticker={}", sticker.id).into());
    let window = WebviewWindowBuilder::new(app, &label, url)
        .title(&sticker.name)
        .inner_size(sticker.width as f64, sticker.height as f64)
        .position(sticker.x as f64, sticker.y as f64)
        .transparent(true)
        .decorations(false)
        .shadow(false)
        .resizable(false)
        .always_on_top(sticker.always_on_top)
        .skip_taskbar(true)
        .focused(false)
        .visible(false)
        .build()
        .map_err(|error| error.to_string())?;

    platform::remove_system_shadow(&window).map_err(|error| error.to_string())?;
    window.set_position(Position::Physical(PhysicalPosition::new(sticker.x, sticker.y))).map_err(|error| error.to_string())?;
    window.set_size(Size::Physical(PhysicalSize::new(sticker.width, sticker.height))).map_err(|error| error.to_string())?;
    platform::set_click_through(&window, sticker.click_through && !edit_mode).map_err(|error| error.to_string())?;
    window.show().map_err(|error| error.to_string())?;

    let app_handle = app.clone();
    let sticker_id = sticker.id.clone();
    window.on_window_event(move |event| match event {
        WindowEvent::Moved(position) => {
            // Programmatic resizes can queue intermediate move events. Never persist
            // one after the window has already reached a newer position.
            if app_handle.get_webview_window(&format!("{STICKER_LABEL_PREFIX}{sticker_id}"))
                .and_then(|window| window.outer_position().ok()) == Some(*position) {
                let _ = update_geometry(&app_handle, &sticker_id, Some((position.x, position.y)), None);
            }
        }
        _ => {}
    });

    Ok(())
}

fn update_geometry(app: &AppHandle, id: &str, position: Option<(i32, i32)>, size: Option<(u32, u32)>) -> Result<(), String> {
    let state = app.state::<AppState>();
    {
        let mut data = state.data.lock().map_err(|_| "Sticker state is unavailable")?;
        let sticker = data.stickers.iter_mut().find(|sticker| sticker.id == id).ok_or("Sticker not found")?;
        if let Some((x, y)) = position { sticker.x = x; sticker.y = y; }
        if let Some((width, height)) = size { sticker.width = width.max(24); sticker.height = height.max(24); }
    }
    state.save()
}

pub fn update_sticker(app: &AppHandle, id: &str, patch: StickerPatch) -> Result<Sticker, String> {
    let state = app.state::<AppState>();
    if let Some(collection_id) = patch.collection_id.as_deref().filter(|id| !id.is_empty()) {
        if !state.data.lock().map_err(|_| "Sticker state is unavailable")?.collections.iter().any(|collection| collection.id == collection_id) {
            return Err("Collection not found".into());
        }
    }
    let (sticker, aspect_restored) = {
        let mut data = state.data.lock().map_err(|_| "Sticker state is unavailable")?;
        let sticker = data.stickers.iter_mut().find(|sticker| sticker.id == id).ok_or("Sticker not found")?;
        let aspect_restored = patch.maintain_aspect_ratio == Some(true) && !sticker.maintain_aspect_ratio;
        patch.apply_to(sticker);
        if aspect_restored {
            let ratio = sticker.aspect_ratio.filter(|value| value.is_finite() && *value > 0.0)
                .unwrap_or(sticker.width as f64 / sticker.height.max(1) as f64);
            let width = (sticker.height as f64 * ratio).min(sticker.width as f64).round().max(24.0) as u32;
            let height = (width as f64 / ratio).round().max(24.0) as u32;
            sticker.x += (sticker.width as i32 - width as i32) / 2;
            sticker.y += (sticker.height as i32 - height as i32) / 2;
            sticker.width = width;
            sticker.height = height;
        }
        (sticker.clone(), aspect_restored)
    };
    state.save()?;
    if aspect_restored {
        let label = format!("{STICKER_LABEL_PREFIX}{id}");
        if let Some(window) = app.get_webview_window(&label) {
            window.set_size(Size::Physical(PhysicalSize::new(sticker.width, sticker.height))).map_err(|error| error.to_string())?;
            window.set_position(Position::Physical(PhysicalPosition::new(sticker.x, sticker.y))).map_err(|error| error.to_string())?;
        }
    }
    apply_window_state(app, &sticker)?;
    notify_changed(app);
    Ok(sticker)
}

fn apply_window_state(app: &AppHandle, sticker: &Sticker) -> Result<(), String> {
    let label = format!("{STICKER_LABEL_PREFIX}{}", sticker.id);
    if !effective_visibility(app, sticker)? {
        if let Some(window) = app.get_webview_window(&label) {
            // Keep the native WebView alive so it can be shown again reliably.
            // The sticker renderer unmounts its image/GIF while this window is hidden.
            window.hide().map_err(|error| error.to_string())?;
        }
        return Ok(());
    }
    if app.get_webview_window(&label).is_none() { return create_sticker_window(app, sticker); }
    let window = app.get_webview_window(&label).ok_or("Sticker window not found")?;
    let edit_mode = *app.state::<AppState>().edit_mode.lock().map_err(|_| "Edit state is unavailable")?;
    window.set_always_on_top(sticker.always_on_top).map_err(|error| error.to_string())?;
    window.set_resizable(false).map_err(|error| error.to_string())?;
    platform::set_click_through(&window, sticker.click_through && !edit_mode).map_err(|error| error.to_string())?;
    window.show().map_err(|error| error.to_string())
}

fn effective_visibility(app: &AppHandle, sticker: &Sticker) -> Result<bool, String> {
    let state = app.state::<AppState>();
    let data = state.data.lock().map_err(|_| "Sticker state is unavailable")?;
    Ok(sticker.visible && sticker.collection_id.as_ref()
        .and_then(|id| data.collections.iter().find(|collection| &collection.id == id))
        .is_none_or(|collection| collection.enabled))
}

pub fn create_collection(app: &AppHandle, name: String, emoji: String) -> Result<StickerCollection, String> {
    let name = name.trim();
    if name.is_empty() || name.chars().count() > 60 { return Err("El nombre debe tener entre 1 y 60 caracteres".into()); }
    let state = app.state::<AppState>();
    let emoji = emoji.trim();
    if emoji.is_empty() || emoji.chars().count() > 8 { return Err("Elige un emoji válido".into()); }
    let collection = StickerCollection {
        id: Uuid::new_v4().to_string(), name: name.to_string(), emoji: emoji.to_string(), enabled: true,
        created_at: SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64,
    };
    state.data.lock().map_err(|_| "Sticker state is unavailable")?.collections.push(collection.clone());
    state.save()?;
    notify_changed(app);
    Ok(collection)
}

pub fn update_collection(app: &AppHandle, id: &str, name: String, emoji: String) -> Result<StickerCollection, String> {
    let name = name.trim();
    let emoji = emoji.trim();
    if name.is_empty() || name.chars().count() > 60 { return Err("El nombre debe tener entre 1 y 60 caracteres".into()); }
    if emoji.is_empty() || emoji.chars().count() > 8 { return Err("Elige un emoji válido".into()); }
    let state = app.state::<AppState>();
    let updated = {
        let mut data = state.data.lock().map_err(|_| "Sticker state is unavailable")?;
        let collection = data.collections.iter_mut().find(|collection| collection.id == id).ok_or("Collection not found")?;
        collection.name = name.to_string();
        collection.emoji = emoji.to_string();
        collection.clone()
    };
    state.save()?;
    notify_changed(app);
    Ok(updated)
}

pub fn set_collection_enabled(app: &AppHandle, id: &str, enabled: bool) -> Result<(), String> {
    let state = app.state::<AppState>();
    let stickers = {
        let mut data = state.data.lock().map_err(|_| "Sticker state is unavailable")?;
        let collection = data.collections.iter_mut().find(|collection| collection.id == id).ok_or("Collection not found")?;
        collection.enabled = enabled;
        data.stickers.iter().filter(|sticker| sticker.collection_id.as_deref() == Some(id)).cloned().collect::<Vec<_>>()
    };
    state.save()?;
    for sticker in stickers { apply_window_state(app, &sticker)?; }
    notify_changed(app);
    Ok(())
}

pub fn delete_collection(app: &AppHandle, id: &str, delete_stickers: bool) -> Result<(), String> {
    let state = app.state::<AppState>();
    let (affected, removed) = {
        let mut data = state.data.lock().map_err(|_| "Sticker state is unavailable")?;
        let index = data.collections.iter().position(|collection| collection.id == id).ok_or("Collection not found")?;
        data.collections.remove(index);
        if delete_stickers {
            let mut removed = Vec::new();
            data.stickers.retain(|sticker| {
                if sticker.collection_id.as_deref() == Some(id) { removed.push(sticker.clone()); false } else { true }
            });
            (Vec::new(), removed)
        } else {
            let mut affected = Vec::new();
            for sticker in &mut data.stickers {
                if sticker.collection_id.as_deref() == Some(id) {
                    sticker.collection_id = None;
                    affected.push(sticker.clone());
                }
            }
            (affected, Vec::new())
        }
    };
    state.save()?;
    for sticker in affected { apply_window_state(app, &sticker)?; }
    for sticker in removed {
        if let Some(window) = app.get_webview_window(&format!("{STICKER_LABEL_PREFIX}{}", sticker.id)) { let _ = window.destroy(); }
        if let Some(editor) = app.get_webview_window(&format!("sticker-editor-{}", sticker.id)) { let _ = editor.destroy(); }
        let _ = fs::remove_file(state.app_data_dir.join("stickers").join(sticker.source));
    }
    notify_changed(app);
    Ok(())
}

pub fn delete_sticker(app: &AppHandle, id: &str) -> Result<(), String> {
    let state = app.state::<AppState>();
    let removed = {
        let mut data = state.data.lock().map_err(|_| "Sticker state is unavailable")?;
        let index = data.stickers.iter().position(|sticker| sticker.id == id).ok_or("Sticker not found")?;
        data.stickers.remove(index)
    };
    state.save()?;
    if let Some(window) = app.get_webview_window(&format!("{STICKER_LABEL_PREFIX}{id}")) {
        window.destroy().map_err(|error| error.to_string())?;
    }
    if let Some(editor) = app.get_webview_window(&format!("sticker-editor-{id}")) {
        let _ = editor.destroy();
    }
    let _ = fs::remove_file(state.app_data_dir.join("stickers").join(removed.source));
    notify_changed(app);
    Ok(())
}

pub fn open_sticker_editor(app: &AppHandle, id: &str) -> Result<(), String> {
    let sticker = app.state::<AppState>().sticker(id)?;
    let label = format!("sticker-editor-{id}");
    if let Some(window) = app.get_webview_window(&label) {
        return window.show().and_then(|_| window.set_focus()).map_err(|error| error.to_string());
    }

    WebviewWindowBuilder::new(app, &label, WebviewUrl::App(format!("index.html?editor={id}").into()))
        .title(format!("Edit · {}", sticker.name))
        .inner_size(480.0, 660.0)
        .min_inner_size(480.0, 660.0)
        .resizable(false)
        .decorations(false)
        .transparent(false)
        .shadow(true)
        .always_on_top(false)
        .center()
        .build()
        .map_err(|error| error.to_string())
        .map(|window| { platform::round_editor_window(&window); window })?;
    Ok(())
}

pub fn resize_sticker(app: &AppHandle, id: &str, requested_width: u32, requested_height: u32, x: i32, y: i32) -> Result<(), String> {
    let sticker = app.state::<AppState>().sticker(id)?;
    if sticker.locked { return Err("Sticker is locked".into()); }
    let ratio = sticker.aspect_ratio.filter(|value| value.is_finite() && *value > 0.0)
        .unwrap_or(sticker.width as f64 / sticker.height.max(1) as f64);
    let (width, height) = if sticker.maintain_aspect_ratio {
        let min_width = (24.0 * ratio).max(24.0).ceil() as u32;
        let width = requested_width.max(min_width);
        (width, (width as f64 / ratio).round().max(24.0) as u32)
    } else {
        (requested_width.max(24), requested_height.max(24))
    };
    let label = format!("{STICKER_LABEL_PREFIX}{id}");
    let window = app.get_webview_window(&label).ok_or("Sticker window not found")?;
    if window.inner_size().map_err(|error| error.to_string())? != PhysicalSize::new(width, height) {
        window.set_size(Size::Physical(PhysicalSize::new(width, height))).map_err(|error| error.to_string())?;
    }
    if window.outer_position().map_err(|error| error.to_string())? != PhysicalPosition::new(x, y) {
        window.set_position(Position::Physical(PhysicalPosition::new(x, y))).map_err(|error| error.to_string())?;
    }
    let actual_position = window.outer_position().map_err(|error| error.to_string())?;
    let actual_size = window.inner_size().map_err(|error| error.to_string())?;
    update_geometry(app, id, Some((actual_position.x, actual_position.y)), Some((actual_size.width, actual_size.height)))?;
    notify_changed(app);
    Ok(())
}

pub fn set_all_visibility(app: &AppHandle, visible: bool) -> Result<(), String> {
    let state = app.state::<AppState>();
    let stickers = {
        let mut data = state.data.lock().map_err(|_| "Sticker state is unavailable")?;
        for sticker in &mut data.stickers { sticker.visible = visible; }
        if visible { for collection in &mut data.collections { collection.enabled = true; } }
        data.stickers.clone()
    };
    state.save()?;
    for sticker in stickers { apply_window_state(app, &sticker)?; }
    notify_changed(app);
    Ok(())
}

pub fn set_edit_mode(app: &AppHandle, enabled: bool) -> Result<(), String> {
    let state = app.state::<AppState>();
    *state.edit_mode.lock().map_err(|_| "Edit state is unavailable")? = enabled;
    let stickers = state.snapshot()?.stickers;
    for sticker in stickers { apply_window_state(app, &sticker)?; }
    notify_changed(app);
    Ok(())
}

pub fn show_manager(app: &AppHandle) -> Result<(), String> {
    show_manager_page(app, "library")
}

pub fn show_add(app: &AppHandle) -> Result<(), String> {
    show_manager_page(app, "add")
}

fn show_manager_page(app: &AppHandle, page: &str) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("Manager window not found")?;
    window.show().map_err(|error| error.to_string())?;
    let _ = window.set_always_on_top(false);
    let _ = window.set_focus();
    let _ = window.eval(match page {
        "add" => "window.location.hash = 'add'",
        _ => "window.location.hash = 'library'",
    });
    Ok(())
}

pub fn notify_changed(app: &AppHandle) {
    let _ = app.emit("stickers://changed", ());
}
