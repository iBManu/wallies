mod autostart;
mod commands;
mod data_dir;
mod models;
mod online;
mod platform;
mod settings;
mod sticker_manager;
mod tray;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = sticker_manager::show_manager(app);
        }))
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::list_stickers,
            commands::import_sticker,
            commands::import_sticker_bytes,
            commands::import_sticker_url,
            commands::search_online_gifs,
            commands::create_collection,
            commands::update_collection,
            commands::set_collection_enabled,
            commands::delete_collection,
            commands::update_sticker,
            commands::delete_sticker,
            commands::set_edit_mode,
            commands::show_all_stickers,
            commands::hide_all_stickers,
            commands::sticker_asset_path,
            commands::open_sticker_editor,
            commands::resize_sticker,
            commands::get_settings,
            commands::set_language,
            commands::set_autostart,
            commands::open_data_folder,
            commands::open_credit_link,
        ])
        .setup(|app| {
            let state = sticker_manager::AppState::load(app.handle())
                .map_err(std::io::Error::other)?;
            app.manage(state);
            app.manage(settings::SettingsState::load(app.handle()).map_err(std::io::Error::other)?);
            tray::setup(app)?;
            sticker_manager::restore_windows(app.handle())
                .map_err(std::io::Error::other)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building Wallies");
    app.run(|handle, event| {
        if matches!(event, tauri::RunEvent::Ready) && !std::env::args().any(|argument| argument == "--autostart") {
            let _ = sticker_manager::show_manager(handle);
        }
    });
}
