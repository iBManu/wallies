use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    App, AppHandle, Manager,
};

use crate::{settings::SettingsState, sticker_manager};

struct TrayLabels {
    add: MenuItem<tauri::Wry>,
    show_all: MenuItem<tauri::Wry>,
    hide_all: MenuItem<tauri::Wry>,
    edit: MenuItem<tauri::Wry>,
    settings: MenuItem<tauri::Wry>,
    quit: MenuItem<tauri::Wry>,
}

pub fn apply_language(app: &AppHandle, language: &str) -> tauri::Result<()> {
    let items = app.state::<TrayLabels>();
    let labels = menu_labels(language);
    items.add.set_text(labels.0)?;
    items.show_all.set_text(labels.1)?;
    items.hide_all.set_text(labels.2)?;
    items.edit.set_text(labels.3)?;
    items.settings.set_text(labels.4)?;
    items.quit.set_text(labels.5)?;
    Ok(())
}

fn menu_labels(language: &str) -> (&'static str, &'static str, &'static str, &'static str, &'static str, &'static str) {
    match language {
        "es" => ("Añadir sticker", "Mostrar todos", "Ocultar todos", "Editar stickers", "Abrir aplicación", "Salir"),
        "de" => ("Sticker hinzufügen", "Alle anzeigen", "Alle ausblenden", "Sticker bearbeiten", "App öffnen", "Beenden"),
        "zh" => ("添加贴纸", "全部显示", "全部隐藏", "编辑贴纸", "打开应用", "退出"),
        "ja" => ("ステッカーを追加", "すべて表示", "すべて非表示", "ステッカーを編集", "アプリを開く", "終了"),
        "pt" => ("Adicionar sticker", "Mostrar todos", "Ocultar todos", "Editar stickers", "Abrir aplicação", "Sair"),
        "it" => ("Aggiungi sticker", "Mostra tutti", "Nascondi tutti", "Modifica sticker", "Apri app", "Esci"),
        "fr" => ("Ajouter un sticker", "Tout afficher", "Tout masquer", "Modifier les stickers", "Ouvrir l’application", "Quitter"),
        _ => ("Add Sticker", "Show All", "Hide All", "Edit Stickers", "Open App", "Quit"),
    }
}

pub fn setup(app: &App) -> tauri::Result<()> {
    let language = app.state::<SettingsState>().language().unwrap_or_else(|_| "es".into());
    let labels = menu_labels(&language);
    let add = MenuItem::with_id(app, "add", labels.0, true, None::<&str>)?;
    let show_all = MenuItem::with_id(app, "show_all", labels.1, true, None::<&str>)?;
    let hide_all = MenuItem::with_id(app, "hide_all", labels.2, true, None::<&str>)?;
    let edit = MenuItem::with_id(app, "edit", labels.3, true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", labels.4, true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", labels.5, true, None::<&str>)?;
    let separator_one = PredefinedMenuItem::separator(app)?;
    let separator_two = PredefinedMenuItem::separator(app)?;
    let separator_three = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(app, &[&add, &separator_one, &show_all, &hide_all, &edit, &separator_two, &settings, &separator_three, &quit])?;
    app.manage(TrayLabels { add: add.clone(), show_all: show_all.clone(), hide_all: hide_all.clone(), edit: edit.clone(), settings: settings.clone(), quit: quit.clone() });

    let icon = tray_icon();
    TrayIconBuilder::with_id("wallies")
        .tooltip("Wallies")
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                let _ = sticker_manager::show_manager(tray.app_handle());
            }
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            "add" => {
                let _ = sticker_manager::show_add(app);
            }
            "show_all" => { let _ = sticker_manager::set_all_visibility(app, true); }
            "hide_all" => { let _ = sticker_manager::set_all_visibility(app, false); }
            "edit" => {
                if let Ok(snapshot) = app.state::<sticker_manager::AppState>().snapshot() {
                    let _ = sticker_manager::set_edit_mode(app, !snapshot.edit_mode);
                }
            }
            "settings" => { let _ = sticker_manager::show_manager(app); }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;
    Ok(())
}

fn tray_icon() -> Image<'static> {
    let bitmap = image::load_from_memory(include_bytes!("../icons/32x32.png"))
        .expect("bundled tray icon must be valid PNG")
        .to_rgba8();
    Image::new_owned(bitmap.into_raw(), 32, 32)
}
