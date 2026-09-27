use std::{fs, path::PathBuf};

use tauri::{AppHandle, Manager};

pub fn path(app: &AppHandle) -> Result<PathBuf, String> {
    let path = app.path().data_dir().map_err(|error| error.to_string())?.join("Wallies");
    fs::create_dir_all(&path).map_err(|error| error.to_string())?;
    Ok(path)
}
