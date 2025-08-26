// Prevents additional console window on Windows in release, DO NOT REMOVE!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::path::{Component, Path, PathBuf};
use std::{env, fs};
// removed unused import

#[derive(Debug, Serialize, Deserialize)]
struct FileInfo {
    name: String,
    path: String,
    is_dir: bool,
    size: u64,
    modified: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DirectoryContent {
    path: String,
    files: Vec<FileInfo>,
    directories: Vec<FileInfo>,
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 파일 읽기 명령
#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file {}: {}", path, e))
}

// 파일 쓰기 명령
#[tauri::command]
async fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("Failed to write file {}: {}", path, e))
}

// 디렉토리 읽기 명령
#[tauri::command]
async fn read_directory(path: String) -> Result<DirectoryContent, String> {
    let dir_path = Path::new(&path);

    if !dir_path.exists() {
        return Err(format!("Directory does not exist: {}", path));
    }

    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let mut files = Vec::new();
    let mut directories = Vec::new();

    let entries =
        fs::read_dir(dir_path).map_err(|e| format!("Failed to read directory {}: {}", path, e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let metadata = entry
            .metadata()
            .map_err(|e| format!("Failed to read metadata: {}", e))?;

        let file_info = FileInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            size: metadata.len(),
            modified: metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs()),
        };

        if metadata.is_dir() {
            directories.push(file_info);
        } else {
            files.push(file_info);
        }
    }

    // 정렬
    files.sort_by(|a, b| a.name.cmp(&b.name));
    directories.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(DirectoryContent {
        path,
        files,
        directories,
    })
}

// 디렉토리 생성 명령
#[tauri::command]
async fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory {}: {}", path, e))
}

// 파일/디렉토리 삭제 명령
#[tauri::command]
async fn remove_path(path: String) -> Result<(), String> {
    let path_obj = Path::new(&path);

    if path_obj.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| format!("Failed to remove directory {}: {}", path, e))
    } else {
        fs::remove_file(&path).map_err(|e| format!("Failed to remove file {}: {}", path, e))
    }
}

// 파일/디렉토리 이름 변경 명령
#[tauri::command]
async fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path)
        .map_err(|e| format!("Failed to rename {} to {}: {}", old_path, new_path, e))
}

// 파일/디렉토리 존재 확인 명령
#[tauri::command]
async fn path_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

// 파일 정보 가져오기 명령
#[tauri::command]
async fn get_file_info(path: String) -> Result<FileInfo, String> {
    let path_obj = Path::new(&path);

    if !path_obj.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let metadata =
        fs::metadata(&path).map_err(|e| format!("Failed to read metadata for {}: {}", path, e))?;

    Ok(FileInfo {
        name: path_obj
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        path: path.clone(),
        is_dir: metadata.is_dir(),
        size: metadata.len(),
        modified: metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs()),
    })
}

// 홈 디렉토리 경로 가져오기
#[tauri::command]
async fn get_home_dir() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Failed to get home directory".to_string())
}

// 프로젝트 루트 경로 가져오기
#[tauri::command]
async fn get_project_root() -> Result<String, String> {
    // 금강 프로젝트 루트 경로 반환
    Ok("/home/duksan/바탕화면/gumgang_0_5".to_string())
}

// 파일 검색 명령
#[tauri::command]
async fn search_files(
    directory: String,
    pattern: String,
    max_depth: Option<usize>,
) -> Result<Vec<String>, String> {
    let mut results = Vec::new();
    let dir_path = Path::new(&directory);

    if !dir_path.exists() || !dir_path.is_dir() {
        return Err(format!("Invalid directory: {}", directory));
    }

    search_files_recursive(&dir_path, &pattern, 0, max_depth.unwrap_or(5), &mut results)?;

    Ok(results)
}

fn search_files_recursive(
    dir: &Path,
    pattern: &str,
    current_depth: usize,
    max_depth: usize,
    results: &mut Vec<String>,
) -> Result<(), String> {
    if current_depth > max_depth {
        return Ok(());
    }

    let entries =
        fs::read_dir(dir).map_err(|e| format!("Failed to read directory {:?}: {}", dir, e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();

        // 패턴 매칭
        if file_name.contains(pattern) {
            results.push(path.to_string_lossy().to_string());
        }

        // 재귀적으로 하위 디렉토리 검색
        if path.is_dir() && !file_name.starts_with('.') {
            search_files_recursive(&path, pattern, current_depth + 1, max_depth, results)?;
        }
    }

    Ok(())
}

// 텍스트 파일에서 내용 검색
#[tauri::command]
async fn grep_in_files(
    directory: String,
    pattern: String,
    file_extension: Option<String>,
) -> Result<Vec<(String, Vec<(usize, String)>)>, String> {
    let mut results = Vec::new();
    let dir_path = Path::new(&directory);

    if !dir_path.exists() || !dir_path.is_dir() {
        return Err(format!("Invalid directory: {}", directory));
    }

    grep_recursive(&dir_path, &pattern, file_extension.as_deref(), &mut results)?;

    Ok(results)
}

fn grep_recursive(
    dir: &Path,
    pattern: &str,
    extension: Option<&str>,
    results: &mut Vec<(String, Vec<(usize, String)>)>,
) -> Result<(), String> {
    let entries =
        fs::read_dir(dir).map_err(|e| format!("Failed to read directory {:?}: {}", dir, e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.is_file() {
            // 파일 확장자 확인
            if let Some(ext) = extension {
                if !path.to_string_lossy().ends_with(ext) {
                    continue;
                }
            }

            // 텍스트 파일 읽기 및 검색
            if let Ok(content) = fs::read_to_string(&path) {
                let mut matches = Vec::new();

                for (line_num, line) in content.lines().enumerate() {
                    if line.contains(pattern) {
                        matches.push((line_num + 1, line.to_string()));
                    }
                }

                if !matches.is_empty() {
                    results.push((path.to_string_lossy().to_string(), matches));
                }
            }
        } else if path.is_dir() && !entry.file_name().to_string_lossy().starts_with('.') {
            // 재귀적으로 하위 디렉토리 검색
            grep_recursive(&path, pattern, extension, results)?;
        }
    }

    Ok(())
}

// ---- gg_save: secure evidence writer ----

#[derive(Deserialize, Debug)]
struct SaveReq {
    root: String,    // "status" | "ui" | "conversations" | "sessions"
    path: String,    // e.g., "evidence/ui_crash.log"
    content: String, // file content (UTF-8 text)
    overwrite: Option<bool>,
    #[serde(alias = "ensureDirs", alias = "ensure_dirs")]
    ensure_dirs: Option<bool>,
}

fn gg_root() -> Result<PathBuf, String> {
    let base = env::var("GUMGANG_ROOT")
        .map_err(|_| "GUMGANG_ROOT is not set. Example: /home/duksan/바탕화면".to_string())?;
    let p = PathBuf::from(base);
    if !p.exists() {
        return Err(format!("GUMGANG_ROOT does not exist: {}", p.display()));
    }
    Ok(p)
}

fn join_project_root(root_dir: &Path, logical_root: &str) -> Result<PathBuf, String> {
    let allowed = match logical_root {
        "status" => Some("gumgang_meeting/status"),
        "ui" => Some("gumgang_meeting/ui"),
        "conversations" => Some("gumgang_meeting/conversations"),
        "sessions" => Some("gumgang_meeting/sessions"),
        _ => None,
    };
    match allowed {
        Some(sub) => Ok(root_dir.join(sub)),
        None => Err("invalid root (must be one of: status|ui|conversations|sessions)".to_string()),
    }
}

fn sanitize_rel_path(rel: &str) -> Result<&Path, String> {
    if rel.trim().is_empty() {
        return Err("path must be a non-empty relative path".to_string());
    }
    let p = Path::new(rel);
    if p.is_absolute() {
        return Err("path must be relative (not absolute)".to_string());
    }
    for comp in p.components() {
        match comp {
            Component::ParentDir => return Err("path traversal ('..') is not allowed".to_string()),
            Component::RootDir | Component::Prefix(_) => {
                return Err("invalid path component".to_string())
            }
            Component::CurDir | Component::Normal(_) => {}
        }
    }
    Ok(p)
}

fn ensure_parent_dir(path: &Path) -> Result<(), String> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| format!("create_dir_all failed: {e}"))?;
    }
    Ok(())
}

fn canonical_starts_with(child: &Path, base: &Path) -> Result<bool, String> {
    let c_child = child
        .parent()
        .and_then(|p| p.canonicalize().ok())
        .unwrap_or_else(|| child.to_path_buf());
    let c_base = base
        .canonicalize()
        .map_err(|e| format!("canonicalize base failed: {e}"))?;
    Ok(c_child.starts_with(&c_base))
}

#[tauri::command]
fn gg_save(req: SaveReq) -> Result<serde_json::Value, String> {
    let base_root = gg_root()?;
    let project_root = join_project_root(&base_root, &req.root)?;

    let rel = sanitize_rel_path(&req.path)?;
    let target = project_root.join(rel);

    if !canonical_starts_with(&target, &project_root)? {
        return Err("path traversal blocked".to_string());
    }

    let overwrite = req.overwrite.unwrap_or(true);
    let ensure_dirs = req.ensure_dirs.unwrap_or(true);

    if !overwrite && target.exists() {
        return Err("file exists and overwrite=false".to_string());
    }
    if ensure_dirs {
        ensure_parent_dir(&target)?;
    }

    fs::write(&target, req.content.as_bytes()).map_err(|e| format!("write failed: {e}"))?;

    let bytes = req.content.as_bytes().len();
    Ok(serde_json::json!({
        "root": req.root,
        "path": target.to_string_lossy(),
        "bytes": bytes
    }))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            read_file,
            write_file,
            read_directory,
            create_directory,
            remove_path,
            rename_path,
            path_exists,
            get_file_info,
            get_home_dir,
            get_project_root,
            search_files,
            grep_in_files,
            gg_save
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
