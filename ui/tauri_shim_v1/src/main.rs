#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/*
Tauri v1 — Minimal Shim (Rust sources only)
Purpose
- Provide a single command gg_save that the UI can invoke to write evidence files
  into gumgang_meeting/{status|ui|conversations|sessions}/... under a fixed root.

How this integrates
- The web UI (served by your bridge at http://localhost:3037/ui) already contains
  a small interceptor that, when running under Tauri, routes fetch('/api/save')
  to window.__TAURI__.invoke('gg_save', { root, path, content, overwrite, ensureDirs }).

Run checklist
1) Place this file at: src-tauri/src/main.rs (or include it as your main).
2) Ensure Tauri v1 is set up (cargo tauri dev).
3) Set GUMGANG_ROOT to your home Desktop so paths resolve correctly:
   Linux (bash):
     export GUMGANG_ROOT="/home/duksan/바탕화면"
   Then run:
     cargo tauri dev
4) Make sure your Tauri app loads the remote UI URL (e.g., http://localhost:3037/ui).
   - In tauri.conf.json (v1), allow remote domain:
     {
       "tauri": {
         "security": { "dangerousRemoteDomain": "localhost" },
         "windows": [
           { "url": "http://localhost:3037/ui" }
         ]
       }
     }
5) In the Tauri window:
   - A4 탭에서 "요약 저장", "p95 측정", "에러 스톰"을 눌러 evidence 파일이
     gumgang_meeting/status/evidence/* 에 생성되는지 확인하세요.

Security notes
- gg_save enforces:
  - root must be one of: status, ui, conversations, sessions
  - path must be a non-absolute relative path without traversal (“..”)
  - final resolved path must live under GUMGANG_ROOT/gumgang_meeting/<root>
*/

use std::{
  env,
  fs,
  path::{Component, Path, PathBuf},
};

use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct SaveReq {
  pub root: String,        // "status" | "ui" | "conversations" | "sessions"
  pub path: String,        // e.g., "evidence/ui_crash.log"
  pub content: String,     // file content (UTF-8 text)
  pub overwrite: Option<bool>,
  pub ensureDirs: Option<bool>,
}

fn gg_root() -> Result<PathBuf, String> {
  // Base root where "gumgang_meeting" resides
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
pub fn gg_save(req: SaveReq) -> Result<serde_json::Value, String> {
  let base_root = gg_root()?;
  let project_root = join_project_root(&base_root, &req.root)?;

  let rel = sanitize_rel_path(&req.path)?;
  let target = project_root.join(rel);

  if !canonical_starts_with(&target, &project_root)? {
    return Err("path traversal blocked".to_string());
  }

  let overwrite = req.overwrite.unwrap_or(true);
  let ensure_dirs = req.ensureDirs.unwrap_or(true);

  if !overwrite && target.exists() {
    return Err("file exists and overwrite=false".to_string());
  }
  if ensure_dirs {
    ensure_parent_dir(&target)?;
  }

  fs::write(&target, req.content.as_bytes())
    .map_err(|e| format!("write failed: {e}"))?;

  let bytes = req.content.as_bytes().len();
  Ok(serde_json::json!({
    "root": req.root,
    "path": target.to_string_lossy(),
    "bytes": bytes
  }))
}

fn log_boot() {
  let url_hint = "http://localhost:3037/ui";
  let root = env::var("GUMGANG_ROOT").unwrap_or_else(|_| "(unset)".into());
  println!("[Tauri Shim] gg_save ready");
  println!("[Tauri Shim] GUMGANG_ROOT  : {root}");
  println!("[Tauri Shim] Load UI at    : {url_hint}");
  println!("[Tauri Shim] Tips          : A4 → '요약 저장' / 'p95 측정' / '에러 스톰' to create evidence files");
}

fn main() {
  log_boot();

  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![gg_save])
    // If you need to create a window that points to the remote UI URL,
    // configure it in tauri.conf.json windows[].url = "http://localhost:3037/ui"
    .run(tauri::generate_context!())
    .expect("error while running tauri app");
}
