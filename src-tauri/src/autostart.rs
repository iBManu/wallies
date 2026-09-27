#[cfg(windows)]
mod platform {
    use std::{env, io::ErrorKind};
    use winreg::{enums::{HKEY_CURRENT_USER, KEY_READ, KEY_SET_VALUE}, RegKey};

    const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
    const VALUE_NAME: &str = "Wallies";

    fn executable() -> Result<String, String> {
        env::current_exe()
            .map(|path| path.to_string_lossy().into_owned())
            .map_err(|error| error.to_string())
    }

    fn registered() -> Result<Option<String>, String> {
        let root = RegKey::predef(HKEY_CURRENT_USER);
        let key = match root.open_subkey_with_flags(RUN_KEY, KEY_READ) {
            Ok(key) => key,
            Err(error) if error.kind() == ErrorKind::NotFound => return Ok(None),
            Err(error) => return Err(error.to_string()),
        };
        match key.get_value::<String, _>(VALUE_NAME) {
            Ok(value) => Ok(Some(value)),
            Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
            Err(error) => Err(error.to_string()),
        }
    }

    pub fn is_enabled() -> Result<bool, String> {
        let expected = executable()?;
        Ok(registered()?.is_some_and(|value| value.eq_ignore_ascii_case(&format!("\"{expected}\" --autostart"))))
    }

    pub fn set_enabled(enabled: bool) -> Result<(), String> {
        let root = RegKey::predef(HKEY_CURRENT_USER);
        if enabled {
            let (key, _) = root.create_subkey(RUN_KEY).map_err(|error| error.to_string())?;
            let command = format!("\"{}\" --autostart", executable()?);
            key.set_value(VALUE_NAME, &command).map_err(|error| error.to_string())?;
            if registered()?.as_deref() != Some(command.as_str()) { return Err("Windows startup entry could not be verified".into()); }
            Ok(())
        } else {
            if registered()?.is_none() { return Ok(()); }
            let key = root.open_subkey_with_flags(RUN_KEY, KEY_SET_VALUE).map_err(|error| error.to_string())?;
            key.delete_value(VALUE_NAME).map_err(|error| error.to_string())
        }
    }
}

#[cfg(windows)]
pub use platform::{is_enabled, set_enabled};

#[cfg(not(windows))]
pub fn is_enabled() -> Result<bool, String> { Ok(false) }

#[cfg(not(windows))]
pub fn set_enabled(_enabled: bool) -> Result<(), String> {
    Err("Start with the system is currently available on Windows only".into())
}

