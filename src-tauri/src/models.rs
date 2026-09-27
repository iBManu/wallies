use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sticker {
    pub id: String,
    pub name: String,
    /// File name relative to the app's private stickers directory.
    pub source: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub opacity: f64,
    pub always_on_top: bool,
    pub click_through: bool,
    pub locked: bool,
    pub visible: bool,
    #[serde(default)]
    pub collection_id: Option<String>,
    pub rotation: f64,
    #[serde(default)]
    pub flip_horizontal: bool,
    #[serde(default)]
    pub flip_vertical: bool,
    #[serde(default = "normal_speed")]
    pub playback_speed: f64,
    #[serde(default)]
    pub aspect_ratio: Option<f64>,
    #[serde(default = "default_true")]
    pub maintain_aspect_ratio: bool,
    #[serde(default)]
    pub pixelated: bool,
    #[serde(default)]
    pub crop: CropSettings,
    #[serde(default)]
    pub chroma_key: ChromaKeySettings,
    pub monitor_id: Option<String>,
    pub created_at: u64,
}

const fn normal_speed() -> f64 { 1.0 }
const fn default_true() -> bool { true }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CropSettings {
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
    pub left: f64,
}

impl Default for CropSettings {
    fn default() -> Self { Self { top: 0.0, right: 0.0, bottom: 0.0, left: 0.0 } }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChromaKeySettings {
    pub enabled: bool,
    pub color: String,
    pub tolerance: f64,
}

impl Default for ChromaKeySettings {
    fn default() -> Self { Self { enabled: false, color: "#00ff00".into(), tolerance: 28.0 } }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StickerPatch {
    pub name: Option<String>,
    pub opacity: Option<f64>,
    pub always_on_top: Option<bool>,
    pub click_through: Option<bool>,
    pub locked: Option<bool>,
    pub visible: Option<bool>,
    pub collection_id: Option<String>,
    pub rotation: Option<f64>,
    pub flip_horizontal: Option<bool>,
    pub flip_vertical: Option<bool>,
    pub playback_speed: Option<f64>,
    pub maintain_aspect_ratio: Option<bool>,
    pub pixelated: Option<bool>,
    pub crop: Option<CropSettings>,
    pub chroma_key: Option<ChromaKeySettings>,
}

impl StickerPatch {
    pub fn apply_to(self, sticker: &mut Sticker) {
        if let Some(value) = self.name {
            let name: String = value.trim().chars().take(60).collect();
            sticker.name = if name.is_empty() { "Sticker".into() } else { name };
        }
        if let Some(value) = self.opacity { sticker.opacity = value.clamp(0.1, 1.0); }
        if let Some(value) = self.always_on_top { sticker.always_on_top = value; }
        if let Some(value) = self.click_through { sticker.click_through = value; }
        if let Some(value) = self.locked { sticker.locked = value; }
        if let Some(value) = self.visible { sticker.visible = value; }
        if let Some(value) = self.collection_id { sticker.collection_id = if value.is_empty() { None } else { Some(value) }; }
        if let Some(value) = self.rotation { sticker.rotation = value; }
        if let Some(value) = self.flip_horizontal { sticker.flip_horizontal = value; }
        if let Some(value) = self.flip_vertical { sticker.flip_vertical = value; }
        if let Some(value) = self.playback_speed { sticker.playback_speed = value.clamp(0.25, 3.0); }
        if let Some(value) = self.maintain_aspect_ratio { sticker.maintain_aspect_ratio = value; }
        if let Some(value) = self.pixelated { sticker.pixelated = value; }
        if let Some(value) = self.crop {
            sticker.crop = CropSettings {
                top: value.top.clamp(0.0, 0.9), right: value.right.clamp(0.0, 0.9),
                bottom: value.bottom.clamp(0.0, 0.9), left: value.left.clamp(0.0, 0.9),
            };
        }
        if let Some(mut value) = self.chroma_key {
            value.tolerance = value.tolerance.clamp(1.0, 100.0);
            sticker.chroma_key = value;
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistedData {
    #[serde(default = "schema_version")]
    pub version: u32,
    #[serde(default)]
    pub stickers: Vec<Sticker>,
    #[serde(default)]
    pub collections: Vec<StickerCollection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StickerCollection {
    pub id: String,
    pub name: String,
    #[serde(default = "default_collection_emoji")]
    pub emoji: String,
    pub enabled: bool,
    pub created_at: u64,
}

fn default_collection_emoji() -> String { "📁".into() }

const fn schema_version() -> u32 { 1 }

impl Default for PersistedData {
    fn default() -> Self {
        Self { version: schema_version(), stickers: Vec::new(), collections: Vec::new() }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StickerSnapshot {
    pub stickers: Vec<Sticker>,
    pub collections: Vec<StickerCollection>,
    pub edit_mode: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn old_sticker_data_keeps_safe_defaults() {
        let old = serde_json::json!({
            "version": 1,
            "stickers": [{
                "id": "old", "name": "Old", "source": "old.gif", "x": 10, "y": 20,
                "width": 120, "height": 90, "opacity": 1.0, "alwaysOnTop": true,
                "clickThrough": false, "locked": false, "visible": true, "rotation": 0.0,
                "monitorId": null, "createdAt": 1
            }]
        });
        let data: PersistedData = serde_json::from_value(old).unwrap();
        assert!(data.collections.is_empty());
        assert_eq!(data.stickers[0].collection_id, None);
        assert!(data.stickers[0].maintain_aspect_ratio);
        assert!(!data.stickers[0].pixelated);
        assert!(!data.stickers[0].flip_horizontal);
        assert!(!data.stickers[0].flip_vertical);
    }

    #[test]
    fn moving_out_of_collection_does_not_hide_sticker() {
        let mut sticker: Sticker = serde_json::from_value(serde_json::json!({
            "id": "one", "name": "One", "source": "one.gif", "x": 0, "y": 0,
            "width": 100, "height": 100, "opacity": 1.0, "alwaysOnTop": true,
            "clickThrough": true, "locked": false, "visible": true, "rotation": 0.0,
            "collectionId": "group", "monitorId": null, "createdAt": 1
        })).unwrap();
        StickerPatch { collection_id: Some(String::new()), ..Default::default() }.apply_to(&mut sticker);
        assert_eq!(sticker.collection_id, None);
        assert!(sticker.visible);
    }
}
