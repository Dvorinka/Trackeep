#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use arboard::Clipboard;
use reqwest::blocking::{multipart, Client};
use rfd::{FileDialog, MessageButtons, MessageDialog, MessageLevel};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::time::Duration;
use tauri::menu::{Menu, MenuItem, Submenu};
use tauri::{AppHandle, Manager, Runtime, WebviewUrl, WebviewWindowBuilder};
use url::Url;
use walkdir::WalkDir;

const CONFIG_FILE_NAME: &str = "instance.json";
const SETUP_WINDOW_LABEL: &str = "setup";
const MAIN_WINDOW_LABEL: &str = "main";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct DesktopConfig {
    instance_url: Option<String>,
    api_key: Option<String>,
    sync_folder: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
struct DesktopConfigView {
    instance_url: Option<String>,
    api_key: Option<String>,
    sync_folder: Option<String>,
}

#[derive(Debug, Clone, Serialize, Default)]
struct UploadSummary {
    uploaded: usize,
    shared: usize,
    failed: usize,
    shared_links: Vec<String>,
    clipboard_copied: bool,
    failures: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
struct TokenValidationResult {
    valid: bool,
    token_type: String,
    permissions: Vec<String>,
    message: String,
}

#[derive(Debug, Clone, Deserialize)]
struct UploadedFileResponse {
    id: u64,
    original_name: String,
}

#[derive(Debug, Clone, Deserialize)]
struct FileShareResponse {
    public_share_url: Option<String>,
    share_url: String,
}

#[derive(Debug, Clone)]
struct RuntimeDesktopConfig {
    instance_url: String,
    api_key: String,
    sync_folder: Option<PathBuf>,
}

#[tauri::command]
fn get_desktop_config<R: Runtime>(app: AppHandle<R>) -> Result<DesktopConfigView, String> {
    let config = load_config(&app)?;

    let instance_url = match config.instance_url {
        Some(value) => Some(normalize_instance_url(&value)?),
        None => None,
    };

    let sync_folder = match config.sync_folder {
        Some(value) => Some(normalize_sync_folder(&value)?),
        None => None,
    };

    Ok(DesktopConfigView {
        instance_url,
        api_key: config
            .api_key
            .and_then(|value| normalize_api_key(Some(value)).ok().flatten()),
        sync_folder,
    })
}

#[tauri::command]
fn connect_instance<R: Runtime>(
    app: AppHandle<R>,
    instance_url: String,
    api_key: Option<String>,
    sync_folder: Option<String>,
) -> Result<(), String> {
    let normalized_instance_url = normalize_instance_url(&instance_url)?;
    let normalized_api_key = normalize_api_key(api_key)?;
    let normalized_sync_folder = normalize_optional_sync_folder(sync_folder)?;

    let config = DesktopConfig {
        instance_url: Some(normalized_instance_url.clone()),
        api_key: normalized_api_key,
        sync_folder: normalized_sync_folder,
    };

    save_config(&app, &config)?;
    open_main_window(&app, &normalized_instance_url)?;
    close_window_if_exists(&app, SETUP_WINDOW_LABEL);

    Ok(())
}

#[tauri::command]
fn select_sync_folder() -> Result<Option<String>, String> {
    Ok(FileDialog::new()
        .set_title("Select Trackeep sync folder")
        .pick_folder()
        .map(|path| path_to_string(&path)))
}

#[tauri::command]
fn open_sync_folder<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let config = load_config(&app)?;
    let Some(sync_folder) = config.sync_folder else {
        return Err("No sync folder configured. Open Desktop Integrations to set one.".into());
    };

    let normalized = normalize_sync_folder(&sync_folder)?;
    open::that(&normalized).map_err(|error| format!("Failed to open sync folder: {error}"))
}

#[tauri::command]
fn upload_files_now<R: Runtime>(app: AppHandle<R>) -> Result<UploadSummary, String> {
    let runtime_config = load_runtime_config(&app)?;

    let selected_files = FileDialog::new()
        .set_title("Select files to upload to Trackeep")
        .pick_files();

    let Some(paths) = selected_files else {
        return Ok(UploadSummary::default());
    };

    upload_paths(&runtime_config, &paths, None)
}

#[tauri::command]
fn sync_folder_now<R: Runtime>(app: AppHandle<R>) -> Result<UploadSummary, String> {
    let runtime_config = load_runtime_config(&app)?;
    let sync_folder = runtime_config.sync_folder.clone().ok_or_else(|| {
        "No sync folder configured. Open Desktop Integrations to set one.".to_string()
    })?;

    let files = collect_files(&sync_folder)?;
    if files.is_empty() {
        return Ok(UploadSummary::default());
    }

    upload_paths(&runtime_config, &files, Some(&sync_folder))
}

#[tauri::command]
fn quick_share_files<R: Runtime>(app: AppHandle<R>) -> Result<UploadSummary, String> {
    let runtime_config = load_runtime_config(&app)?;

    let selected_files = FileDialog::new()
        .set_title("Select files to quick share")
        .pick_files();

    let Some(paths) = selected_files else {
        return Ok(UploadSummary::default());
    };

    quick_share_paths(&runtime_config, &paths)
}

#[tauri::command]
fn validate_integration_token(
    instance_url: String,
    token: String,
) -> Result<TokenValidationResult, String> {
    let normalized_instance_url = normalize_instance_url(&instance_url)?;
    let normalized_token = normalize_api_key(Some(token))?
        .ok_or_else(|| "Token is required for validation.".to_string())?;

    validate_token_permissions(&normalized_instance_url, &normalized_token)
}

fn normalize_instance_url(raw: &str) -> Result<String, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("Instance URL is required.".into());
    }

    let mut url = Url::parse(trimmed).map_err(|_| {
        "Instance URL must be a valid absolute URL, for example https://trackeep.your-domain.com"
            .to_string()
    })?;

    match url.scheme() {
        "http" | "https" => {}
        _ => {
            return Err("Only http:// or https:// instance URLs are supported.".into());
        }
    }

    url.set_fragment(None);

    let mut normalized = url.to_string();
    while normalized.ends_with('/') {
        normalized.pop();
    }

    Ok(normalized)
}

fn normalize_api_key(raw: Option<String>) -> Result<Option<String>, String> {
    let Some(value) = raw else {
        return Ok(None);
    };

    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }

    if trimmed.contains(char::is_whitespace) {
        return Err("API key/token must not contain spaces.".into());
    }

    Ok(Some(trimmed.to_string()))
}

fn normalize_sync_folder(raw: &str) -> Result<String, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("Sync folder path is empty.".into());
    }

    let folder = PathBuf::from(trimmed);
    if !folder.exists() {
        return Err(format!("Sync folder does not exist: {}", folder.display()));
    }
    if !folder.is_dir() {
        return Err(format!(
            "Sync folder is not a directory: {}",
            folder.display()
        ));
    }

    Ok(path_to_string(&folder))
}

fn normalize_optional_sync_folder(raw: Option<String>) -> Result<Option<String>, String> {
    let Some(value) = raw else {
        return Ok(None);
    };

    if value.trim().is_empty() {
        return Ok(None);
    }

    Ok(Some(normalize_sync_folder(&value)?))
}

fn config_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Could not resolve config directory: {error}"))?;

    fs::create_dir_all(&config_dir)
        .map_err(|error| format!("Could not create config directory: {error}"))?;

    Ok(config_dir.join(CONFIG_FILE_NAME))
}

fn load_config<R: Runtime>(app: &AppHandle<R>) -> Result<DesktopConfig, String> {
    let path = config_path(app)?;
    if !path.exists() {
        return Ok(DesktopConfig::default());
    }

    let raw = fs::read_to_string(path)
        .map_err(|error| format!("Could not read desktop config file: {error}"))?;

    serde_json::from_str::<DesktopConfig>(&raw)
        .map_err(|error| format!("Desktop config is not valid JSON: {error}"))
}

fn save_config<R: Runtime>(app: &AppHandle<R>, config: &DesktopConfig) -> Result<(), String> {
    let path = config_path(app)?;
    let serialized = serde_json::to_string_pretty(config)
        .map_err(|error| format!("Could not serialize desktop config: {error}"))?;

    fs::write(path, serialized).map_err(|error| format!("Could not save desktop config: {error}"))
}

fn load_runtime_config<R: Runtime>(app: &AppHandle<R>) -> Result<RuntimeDesktopConfig, String> {
    let config = load_config(app)?;

    let instance_url = config.instance_url.ok_or_else(|| {
        "No instance URL configured. Open Desktop Integrations first.".to_string()
    })?;

    let normalized_instance_url = normalize_instance_url(&instance_url)?;

    let api_key = config
        .api_key
        .and_then(|value| normalize_api_key(Some(value)).ok())
        .flatten()
        .ok_or_else(|| {
            "No API key/token configured. Add one in Desktop Integrations first.".to_string()
        })?;

    let sync_folder = match config.sync_folder {
        Some(folder) => Some(PathBuf::from(normalize_sync_folder(&folder)?)),
        None => None,
    };

    Ok(RuntimeDesktopConfig {
        instance_url: normalized_instance_url,
        api_key,
        sync_folder,
    })
}

fn collect_files(folder: &Path) -> Result<Vec<PathBuf>, String> {
    let mut files = Vec::new();

    for entry in WalkDir::new(folder).follow_links(false) {
        let entry = entry.map_err(|error| format!("Failed to scan sync folder: {error}"))?;
        if !entry.file_type().is_file() {
            continue;
        }

        let file_name = entry.file_name().to_string_lossy();
        if file_name.starts_with('.') {
            continue;
        }
        if file_name.eq_ignore_ascii_case("Thumbs.db")
            || file_name.eq_ignore_ascii_case("desktop.ini")
            || file_name.eq_ignore_ascii_case(".DS_Store")
        {
            continue;
        }

        if let Some(parent) = entry.path().parent() {
            if parent
                .components()
                .any(|component| component.as_os_str().to_string_lossy().starts_with('.'))
            {
                continue;
            }
        }

        if let Ok(metadata) = entry.metadata() {
            if metadata.len() == 0 {
                continue;
            }
        }

        if entry.file_type().is_file() {
            files.push(entry.path().to_path_buf());
        }
    }

    files.sort();
    Ok(files)
}

fn upload_paths(
    config: &RuntimeDesktopConfig,
    paths: &[PathBuf],
    sync_root: Option<&Path>,
) -> Result<UploadSummary, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|error| format!("Failed to initialize HTTP client: {error}"))?;

    let upload_url = format!("{}/api/v1/files/upload", config.instance_url);
    let auth_header = format!("Bearer {}", config.api_key);

    let mut summary = UploadSummary::default();

    for path in paths {
        if !path.is_file() {
            continue;
        }

        let description = sync_root.and_then(|root| {
            path.strip_prefix(root)
                .ok()
                .map(|relative| format!("Desktop sync: {}", relative.display()))
        });

        match upload_single_file(&client, &upload_url, &auth_header, path, description) {
            Ok(_) => {
                summary.uploaded += 1;
            }
            Err(error) => {
                summary.failed += 1;
                summary
                    .failures
                    .push(format!("{} -> {error}", path.display()));
            }
        }
    }

    Ok(summary)
}

fn upload_single_file(
    client: &Client,
    upload_url: &str,
    auth_header: &str,
    file_path: &Path,
    description: Option<String>,
) -> Result<UploadedFileResponse, String> {
    let filename = file_path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| format!("Invalid file name: {}", file_path.display()))?
        .to_string();

    let file =
        fs::File::open(file_path).map_err(|error| format!("Could not open local file: {error}"))?;

    let mime = mime_guess::from_path(file_path).first_or_octet_stream();

    let part = multipart::Part::reader(file)
        .file_name(filename)
        .mime_str(mime.essence_str())
        .map_err(|error| format!("Could not build multipart payload: {error}"))?;

    let mut form = multipart::Form::new().part("file", part);
    if let Some(value) = description {
        form = form.text("description", value);
    }

    let response = client
        .post(upload_url)
        .header("Authorization", auth_header)
        .multipart(form)
        .send()
        .map_err(|error| format!("Upload request failed: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_default();
        let trimmed = body.trim();

        if trimmed.is_empty() {
            return Err(format!("HTTP {status}"));
        }

        return Err(format!("HTTP {status}: {}", truncate(trimmed, 180)));
    }

    response
        .json::<UploadedFileResponse>()
        .map_err(|error| format!("Failed to parse upload response: {error}"))
}

fn quick_share_paths(
    config: &RuntimeDesktopConfig,
    paths: &[PathBuf],
) -> Result<UploadSummary, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|error| format!("Failed to initialize HTTP client: {error}"))?;

    let upload_url = format!("{}/api/v1/files/upload", config.instance_url);
    let auth_header = format!("Bearer {}", config.api_key);

    let mut summary = UploadSummary::default();
    let mut links = Vec::new();

    for path in paths {
        if !path.is_file() {
            continue;
        }

        match upload_single_file(&client, &upload_url, &auth_header, path, None) {
            Ok(uploaded) => {
                summary.uploaded += 1;

                match create_file_share(
                    &client,
                    &config.instance_url,
                    &auth_header,
                    uploaded.id,
                    &uploaded.original_name,
                ) {
                    Ok(link) => {
                        summary.shared += 1;
                        links.push(link);
                    }
                    Err(error) => {
                        summary.failed += 1;
                        summary
                            .failures
                            .push(format!("{} -> share failed: {error}", path.display()));
                    }
                }
            }
            Err(error) => {
                summary.failed += 1;
                summary
                    .failures
                    .push(format!("{} -> upload failed: {error}", path.display()));
            }
        }
    }

    if !links.is_empty() {
        summary.shared_links = links.clone();
        summary.clipboard_copied = copy_links_to_clipboard(&links).is_ok();
    }

    Ok(summary)
}

fn create_file_share(
    client: &Client,
    instance_url: &str,
    auth_header: &str,
    file_id: u64,
    title: &str,
) -> Result<String, String> {
    let endpoint = format!("{instance_url}/api/v1/files/{file_id}/share");
    let payload = serde_json::json!({
        "title": format!("Shared from desktop: {title}"),
        "allow_download": true
    });

    let response = client
        .post(endpoint)
        .header("Authorization", auth_header)
        .json(&payload)
        .send()
        .map_err(|error| format!("Share request failed: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_default();
        let trimmed = body.trim();
        if trimmed.is_empty() {
            return Err(format!("HTTP {status}"));
        }
        return Err(format!("HTTP {status}: {}", truncate(trimmed, 180)));
    }

    let share = response
        .json::<FileShareResponse>()
        .map_err(|error| format!("Failed to parse share response: {error}"))?;

    if let Some(public) = share.public_share_url {
        if !public.trim().is_empty() {
            return Ok(public);
        }
    }

    if share.share_url.starts_with("http://") || share.share_url.starts_with("https://") {
        return Ok(share.share_url);
    }

    let raw_share_url = share.share_url.trim().to_string();
    let mut base = instance_url.trim_end_matches('/').to_string();
    let suffix = if raw_share_url.starts_with('/') {
        raw_share_url
    } else {
        format!("/{}", raw_share_url)
    };
    base.push_str(&suffix);
    Ok(base)
}

fn copy_links_to_clipboard(links: &[String]) -> Result<(), String> {
    if links.is_empty() {
        return Ok(());
    }

    let mut clipboard =
        Clipboard::new().map_err(|error| format!("Could not access system clipboard: {error}"))?;

    clipboard
        .set_text(links.join("\n"))
        .map_err(|error| format!("Could not copy links to clipboard: {error}"))
}

fn validate_token_permissions(
    instance_url: &str,
    token: &str,
) -> Result<TokenValidationResult, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|error| format!("Failed to initialize HTTP client: {error}"))?;

    let auth_header = format!("Bearer {token}");

    if token.starts_with("tk_") {
        let endpoint = format!("{instance_url}/api/v1/browser-extension/validate");
        let response = client
            .get(endpoint)
            .header("Authorization", auth_header)
            .send()
            .map_err(|error| format!("Validation request failed: {error}"))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().unwrap_or_default();
            return Ok(TokenValidationResult {
                valid: false,
                token_type: "api_key".into(),
                permissions: Vec::new(),
                message: format!(
                    "Validation failed ({status}): {}",
                    truncate(body.trim(), 160)
                ),
            });
        }

        let json: Value = response
            .json()
            .map_err(|error| format!("Failed to parse validation response: {error}"))?;

        let permissions = json
            .get("permissions")
            .and_then(|value| value.as_array())
            .map(|values| {
                values
                    .iter()
                    .filter_map(|item| item.as_str().map(|raw| raw.to_string()))
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();

        return Ok(TokenValidationResult {
            valid: json
                .get("valid")
                .and_then(|value| value.as_bool())
                .unwrap_or(true),
            token_type: "api_key".into(),
            permissions,
            message: "API key validated.".into(),
        });
    }

    let endpoint = format!("{instance_url}/api/v1/auth/me");
    let response = client
        .get(endpoint)
        .header("Authorization", auth_header)
        .send()
        .map_err(|error| format!("Validation request failed: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_default();
        return Ok(TokenValidationResult {
            valid: false,
            token_type: "jwt".into(),
            permissions: Vec::new(),
            message: format!(
                "Validation failed ({status}): {}",
                truncate(body.trim(), 160)
            ),
        });
    }

    Ok(TokenValidationResult {
        valid: true,
        token_type: "jwt".into(),
        permissions: vec!["*".into()],
        message: "JWT token is valid for this instance.".into(),
    })
}

fn truncate(value: &str, max_chars: usize) -> String {
    if value.chars().count() <= max_chars {
        return value.to_string();
    }

    let mut out = String::new();
    for (index, ch) in value.chars().enumerate() {
        if index >= max_chars {
            break;
        }
        out.push(ch);
    }
    out.push_str("...");
    out
}

fn close_window_if_exists<R: Runtime>(app: &AppHandle<R>, label: &str) {
    if let Some(window) = app.get_webview_window(label) {
        let _ = window.close();
    }
}

fn open_setup_window<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    if let Some(existing) = app.get_webview_window(SETUP_WINDOW_LABEL) {
        let _ = existing.show();
        let _ = existing.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(
        app,
        SETUP_WINDOW_LABEL,
        WebviewUrl::App("index.html".into()),
    )
    .title("Trackeep Desktop - Integrations")
    .inner_size(860.0, 760.0)
    .resizable(true)
    .center()
    .build()
    .map_err(|error| format!("Failed to open setup window: {error}"))?;

    Ok(())
}

fn open_main_window<R: Runtime>(app: &AppHandle<R>, instance_url: &str) -> Result<(), String> {
    let parsed = Url::parse(instance_url)
        .map_err(|error| format!("Saved instance URL is not valid: {error}"))?;

    close_window_if_exists(app, MAIN_WINDOW_LABEL);

    let title_suffix = parsed.host_str().unwrap_or("Trackeep").to_string();

    WebviewWindowBuilder::new(app, MAIN_WINDOW_LABEL, WebviewUrl::External(parsed))
        .title(format!("Trackeep Desktop - {title_suffix}"))
        .inner_size(1440.0, 920.0)
        .min_inner_size(1024.0, 640.0)
        .center()
        .build()
        .map_err(|error| format!("Failed to open instance window: {error}"))?;

    Ok(())
}

fn setup_menu<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let desktop_integrations = MenuItem::with_id(
        app,
        "desktop_integrations",
        "Desktop Integrations...",
        true,
        None::<&str>,
    )
    .map_err(|error| format!("Failed to create menu item: {error}"))?;

    let upload_files =
        MenuItem::with_id(app, "upload_files", "Upload Files...", true, None::<&str>)
            .map_err(|error| format!("Failed to create menu item: {error}"))?;

    let sync_folder_now = MenuItem::with_id(
        app,
        "sync_folder_now",
        "Sync Folder Now",
        true,
        None::<&str>,
    )
    .map_err(|error| format!("Failed to create menu item: {error}"))?;

    let quick_share = MenuItem::with_id(
        app,
        "quick_share_files",
        "Quick Share Files...",
        true,
        None::<&str>,
    )
    .map_err(|error| format!("Failed to create menu item: {error}"))?;

    let open_sync_folder = MenuItem::with_id(
        app,
        "open_sync_folder",
        "Open Sync Folder",
        true,
        None::<&str>,
    )
    .map_err(|error| format!("Failed to create menu item: {error}"))?;

    let reload_instance = MenuItem::with_id(
        app,
        "reload_instance",
        "Reload Instance",
        true,
        None::<&str>,
    )
    .map_err(|error| format!("Failed to create menu item: {error}"))?;

    let quit_app = MenuItem::with_id(app, "quit_app", "Quit", true, None::<&str>)
        .map_err(|error| format!("Failed to create menu item: {error}"))?;

    let trackeep_menu = Submenu::with_id_and_items(
        app,
        "trackeep",
        "Trackeep",
        true,
        &[
            &desktop_integrations,
            &upload_files,
            &quick_share,
            &sync_folder_now,
            &open_sync_folder,
            &reload_instance,
            &quit_app,
        ],
    )
    .map_err(|error| format!("Failed to create submenu: {error}"))?;

    let menu = Menu::with_items(app, &[&trackeep_menu])
        .map_err(|error| format!("Failed to create app menu: {error}"))?;

    app.set_menu(menu)
        .map_err(|error| format!("Failed to attach app menu: {error}"))?;

    Ok(())
}

fn show_summary_dialog(title: &str, summary: &UploadSummary) {
    let mut details = format!(
        "Uploaded: {}\nShared links: {}\nFailed: {}",
        summary.uploaded, summary.shared, summary.failed
    );

    if summary.clipboard_copied && !summary.shared_links.is_empty() {
        details.push_str("\n\nShare links were copied to clipboard.");
    }

    if !summary.shared_links.is_empty() {
        details.push_str("\n\nLinks:\n");
        for link in summary.shared_links.iter().take(5) {
            details.push_str("- ");
            details.push_str(link);
            details.push('\n');
        }
        if summary.shared_links.len() > 5 {
            details.push_str("- ...\n");
        }
    }

    if summary.failed > 0 {
        details.push_str("\n\nErrors:\n");
        for failure in summary.failures.iter().take(5) {
            details.push_str("- ");
            details.push_str(failure);
            details.push('\n');
        }
        if summary.failures.len() > 5 {
            details.push_str("- ...");
        }
    }

    MessageDialog::new()
        .set_level(if summary.failed > 0 {
            MessageLevel::Warning
        } else {
            MessageLevel::Info
        })
        .set_title(title)
        .set_description(details)
        .set_buttons(MessageButtons::Ok)
        .show();
}

fn show_error_dialog(title: &str, error: &str) {
    MessageDialog::new()
        .set_level(MessageLevel::Error)
        .set_title(title)
        .set_description(error)
        .set_buttons(MessageButtons::Ok)
        .show();
}

fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, menu_id: &str) {
    match menu_id {
        "desktop_integrations" => {
            if let Err(error) = open_setup_window(app) {
                show_error_dialog("Trackeep Desktop", &error);
            }
        }
        "upload_files" => match upload_files_now(app.clone()) {
            Ok(summary) => show_summary_dialog("Trackeep Desktop Upload", &summary),
            Err(error) => show_error_dialog("Trackeep Desktop Upload", &error),
        },
        "sync_folder_now" => match sync_folder_now(app.clone()) {
            Ok(summary) => show_summary_dialog("Trackeep Desktop Sync", &summary),
            Err(error) => show_error_dialog("Trackeep Desktop Sync", &error),
        },
        "quick_share_files" => match quick_share_files(app.clone()) {
            Ok(summary) => show_summary_dialog("Trackeep Desktop Quick Share", &summary),
            Err(error) => show_error_dialog("Trackeep Desktop Quick Share", &error),
        },
        "open_sync_folder" => {
            if let Err(error) = open_sync_folder(app.clone()) {
                show_error_dialog("Trackeep Desktop", &error);
            }
        }
        "reload_instance" => {
            if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                let _ = window.eval("window.location.reload();");
            }
        }
        "quit_app" => {
            app.exit(0);
        }
        _ => {}
    }
}

fn boxed_error(message: String) -> Box<dyn std::error::Error> {
    Box::new(io::Error::new(io::ErrorKind::Other, message))
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().to_string()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_desktop_config,
            connect_instance,
            select_sync_folder,
            open_sync_folder,
            upload_files_now,
            sync_folder_now,
            quick_share_files,
            validate_integration_token
        ])
        .on_menu_event(|app, event| {
            handle_menu_event(app, event.id().as_ref());
        })
        .setup(|app| {
            setup_menu(&app.handle()).map_err(boxed_error)?;

            match load_config(&app.handle())
                .map_err(boxed_error)?
                .instance_url
                .as_deref()
                .map(normalize_instance_url)
            {
                Some(Ok(instance_url)) => {
                    open_main_window(&app.handle(), &instance_url).map_err(boxed_error)?;
                }
                Some(Err(_)) | None => {
                    open_setup_window(&app.handle()).map_err(boxed_error)?;
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Trackeep desktop");
}
