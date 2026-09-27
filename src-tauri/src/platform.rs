use tauri::WebviewWindow;

/// Centralizes native window behavior so OS-specific refinements stay out of
/// persistence and UI code. Tauri maps this to WS_EX_TRANSPARENT on Windows.
pub fn set_click_through(window: &WebviewWindow, enabled: bool) -> tauri::Result<()> {
    window.set_ignore_cursor_events(enabled)
}

/// Tauri disables the native shadow on supported platforms. This function is
/// the extension point for future per-OS refinements.
pub fn remove_system_shadow(window: &WebviewWindow) -> tauri::Result<()> {
    window.set_shadow(false)
}

/// Ask Windows 11 to clip the borderless editor to native rounded corners.
/// Older Windows versions ignore this preference and retain a normal opaque window.
pub fn round_editor_window(window: &WebviewWindow) {
    #[cfg(windows)]
    if let Ok(hwnd) = window.hwnd() {
        #[link(name = "dwmapi")]
        unsafe extern "system" {
            #[link_name = "DwmSetWindowAttribute"]
            fn set_window_attribute(hwnd: *mut std::ffi::c_void, attribute: u32, value: *const std::ffi::c_void, size: u32) -> i32;
        }
        let rounded: i32 = 2;
        // DWMWA_WINDOW_CORNER_PREFERENCE = 33; DWMWCP_ROUND = 2.
        let _ = unsafe { set_window_attribute(hwnd.0, 33, (&raw const rounded).cast(), std::mem::size_of_val(&rounded) as u32) };
        // Windows 11 otherwise draws a light one-pixel frame around dark borderless windows.
        let no_border: u32 = 0xFFFF_FFFE;
        let _ = unsafe { set_window_attribute(hwnd.0, 34, (&raw const no_border).cast(), std::mem::size_of_val(&no_border) as u32) };
    }
    #[cfg(not(windows))]
    let _ = window;
}
