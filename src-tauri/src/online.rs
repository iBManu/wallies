use std::{fs, io::Read, time::Duration};

use reqwest::{blocking::Client, Url};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use uuid::Uuid;

use crate::{models::Sticker, sticker_manager};

const MAX_DOWNLOAD_BYTES: u64 = 25 * 1024 * 1024;

fn client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(25))
        .user_agent("DesktopStickers/0.1.12 (desktop GIF picker)")
        .build()
        .map_err(|error| error.to_string())
}

fn search_client() -> Result<Client, String> {
    Client::builder()
        .connect_timeout(Duration::from_secs(5))
        .timeout(Duration::from_secs(9))
        .user_agent("DesktopStickers/0.1.13 (desktop GIF search)")
        .build()
        .map_err(|error| error.to_string())
}

#[derive(Deserialize)]
struct GifCitiesEntry {
    checksum: String,
    url_text: String,
    width: Option<u32>,
    height: Option<u32>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GifSearchResult {
    pub id: String,
    pub title: String,
    pub url: String,
    pub width: u32,
    pub height: u32,
    pub source: String,
}

pub fn search_gifs(query: &str, source: &str) -> Result<Vec<GifSearchResult>, String> {
    let query = query.trim();
    if query.is_empty() { return Ok(Vec::new()); }
    if query.len() > 80 { return Err("La búsqueda es demasiado larga".into()); }
    match source {
        "gifcities" => search_gifcities(query, 24),
        "commons" => search_commons(query, 24),
        "all" => {
            let (cities, commons) = std::thread::scope(|scope| {
                let cities = scope.spawn(|| search_gifcities(query, 12));
                let commons = scope.spawn(|| search_commons(query, 12));
                (cities.join().unwrap_or_else(|_| Err("GifCities no respondió".into())),
                 commons.join().unwrap_or_else(|_| Err("Wikimedia Commons no respondió".into())))
            });
            match (cities, commons) {
                (Ok(cities), Ok(commons)) => {
                    let mut merged = Vec::with_capacity(cities.len() + commons.len());
                    let mut cities = cities.into_iter();
                    let mut commons = commons.into_iter();
                    loop {
                        let next_city = cities.next();
                        let next_commons = commons.next();
                        if next_city.is_none() && next_commons.is_none() { break; }
                        if let Some(item) = next_city { merged.push(item); }
                        if let Some(item) = next_commons { merged.push(item); }
                    }
                    Ok(merged)
                }
                (Ok(items), Err(_)) | (Err(_), Ok(items)) => Ok(items),
                (Err(cities_error), Err(commons_error)) => Err(format!("{cities_error}; {commons_error}")),
            }
        }
        _ => Err("Fuente de GIFs desconocida".into()),
    }
}

fn search_gifcities(query: &str, limit: u32) -> Result<Vec<GifSearchResult>, String> {
    let entries: Vec<GifCitiesEntry> = search_client()?
        .get("https://gifcities.archive.org/api/v1/gifsearch")
        .query(&[("q", query), ("limit", &limit.to_string())])
        .send().map_err(|error| format!("No se pudo buscar GIFs: {error}"))?
        .error_for_status().map_err(|error| error.to_string())?
        .json().map_err(|error| format!("Respuesta de búsqueda inválida: {error}"))?;
    Ok(entries.into_iter().filter_map(|item| {
        if item.checksum.len() != 32 || !item.checksum.bytes().all(|byte| byte.is_ascii_uppercase() || byte.is_ascii_digit()) { return None; }
        Some(GifSearchResult {
            url: format!("https://blob.gifcities.org/gifcities/{}.gif", item.checksum),
            id: item.checksum,
            title: item.url_text.replace(['_', '-'], " "),
            width: item.width.unwrap_or(0),
            height: item.height.unwrap_or(0),
            source: "gifcities".into(),
        })
    }).collect())
}

#[derive(Deserialize)]
struct CommonsResponse { query: Option<CommonsQuery> }
#[derive(Deserialize)]
struct CommonsQuery { pages: Vec<CommonsPage> }
#[derive(Deserialize)]
struct CommonsPage { pageid: u64, title: String, imageinfo: Option<Vec<CommonsImageInfo>> }
#[derive(Deserialize)]
struct CommonsImageInfo { url: String, width: u32, height: u32, mime: String, size: u64 }

fn search_commons(query: &str, limit: u32) -> Result<Vec<GifSearchResult>, String> {
    let response: CommonsResponse = search_client()?
        .get("https://commons.wikimedia.org/w/api.php")
        .query(&[
            ("action", "query"), ("generator", "search"),
            ("gsrsearch", &format!("{query} filemime:gif")),
            ("gsrnamespace", "6"), ("gsrlimit", &limit.to_string()),
            ("prop", "imageinfo"), ("iiprop", "url|size|mime"),
            ("format", "json"), ("formatversion", "2"),
        ])
        .send().map_err(|error| format!("No se pudo buscar en Wikimedia Commons: {error}"))?
        .error_for_status().map_err(|error| error.to_string())?
        .json().map_err(|error| format!("Respuesta de Wikimedia Commons inválida: {error}"))?;
    Ok(response.query.into_iter().flat_map(|query| query.pages).filter_map(|page| {
        let image = page.imageinfo?.into_iter().next()?;
        let url = Url::parse(&image.url).ok()?;
        if url.scheme() != "https" || url.host_str() != Some("upload.wikimedia.org")
            || image.mime != "image/gif" || image.size > MAX_DOWNLOAD_BYTES { return None; }
        Some(GifSearchResult {
            id: format!("commons-{}", page.pageid),
            title: page.title.strip_prefix("File:").unwrap_or(&page.title).replace('_', " "),
            url: image.url,
            width: image.width,
            height: image.height,
            source: "commons".into(),
        })
    }).collect())
}

pub fn import_from_url(app: &AppHandle, address: &str, display_name: Option<&str>, collection_id: Option<&str>) -> Result<Sticker, String> {
    let parsed = Url::parse(address.trim()).map_err(|_| "Introduce una URL válida".to_string())?;
    if parsed.scheme() != "https" { return Err("La URL debe empezar por https://".into()); }
    let response = client()?.get(parsed.clone()).send()
        .map_err(|error| format!("No se pudo descargar el archivo: {error}"))?
        .error_for_status().map_err(|error| format!("La descarga falló: {error}"))?;
    if response.url().scheme() != "https" { return Err("La descarga redirigió a una conexión no segura".into()); }
    if response.content_length().is_some_and(|size| size > MAX_DOWNLOAD_BYTES) { return Err("El archivo supera 25 MB".into()); }
    let mut bytes = Vec::new();
    response.take(MAX_DOWNLOAD_BYTES + 1).read_to_end(&mut bytes).map_err(|error| error.to_string())?;
    if bytes.len() as u64 > MAX_DOWNLOAD_BYTES { return Err("El archivo supera 25 MB".into()); }
    let filename = parsed.path_segments().and_then(|mut segments| segments.next_back()).unwrap_or("Sticker");
    let fallback = filename.rsplit_once('.').map(|(stem, _)| stem).unwrap_or(filename);
    let name = display_name.filter(|name| !name.trim().is_empty()).unwrap_or(fallback);
    import_image_bytes(app, bytes, name, collection_id)
}

pub fn import_image_bytes(app: &AppHandle, bytes: Vec<u8>, name: &str, collection_id: Option<&str>) -> Result<Sticker, String> {
    if bytes.len() as u64 > MAX_DOWNLOAD_BYTES { return Err("El archivo supera 25 MB".into()); }
    let extension = match image::guess_format(&bytes) {
        Ok(image::ImageFormat::Gif) => "gif",
        Ok(image::ImageFormat::Png) => "png",
        Ok(image::ImageFormat::Jpeg) => "jpg",
        Ok(image::ImageFormat::WebP) => "webp",
        _ if name.to_ascii_lowercase().ends_with(".svg") && std::str::from_utf8(&bytes).is_ok_and(|text| text.contains("<svg")) => "svg",
        _ => return Err("El archivo no es un GIF, PNG, JPG, WEBP o SVG".into()),
    };
    let app_dir = crate::data_dir::path(app)?;
    let temporary = app_dir.join("stickers").join(format!("download-{}.{}", Uuid::new_v4(), extension));
    fs::write(&temporary, bytes).map_err(|error| error.to_string())?;
    let result = sticker_manager::import_from_path_named(app, &temporary, Some(name), collection_id);
    let _ = fs::remove_file(&temporary);
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore = "requires live network access"]
    fn search_all_sources_responds() {
        let results = search_gifs("cat", "all").expect("search should complete");
        assert!(!results.is_empty());
    }
}
