# TAURI ST-0705 APPLY — gg_save + config (gumgang_v2)

목표
- Tauri에서 UI의 fetch('/api/save')를 invoke('gg_save')로 받아 status/evidence 등에 저장.

대상
- app: gumgang_meeting/gumgang_0_5/gumgang-v2/src-tauri
- conf: gumgang_meeting/gumgang_0_5/gumgang-v2/src-tauri/tauri.conf.json

1) main.rs에 커맨드 추가
- 파일: gumgang_meeting/gumgang_0_5/gumgang-v2/src-tauri/src/main.rs
- 아래 블록을 “다른 #[tauri::command]들 근처”에 붙여넣기

use serde::Deserialize;
use std::{fs, path::{Path, PathBuf}};

#[derive(Deserialize)]
struct SaveReq{ root:String, path:String, content:String, overwrite:Option<bool>, ensureDirs:Option<bool> }

fn safe_join(base:&Path, rel:&str)->Result<PathBuf,String>{
  if rel.is_empty()||rel.starts_with('/')||rel.contains(".."){return Err("invalid path".into());}
  let full=base.join(rel);
  let base=base.canonicalize().map_err(|e|e.to_string())?;
  let parent=full.parent().unwrap_or(&full);
  let parent=parent.canonicalize().unwrap_or(full.clone());
  if !parent.starts_with(&base){return Err("path traversal".into());}
  Ok(full)
}

#[tauri::command]
async fn gg_save(req:SaveReq)->Result<serde_json::Value,String>{
  let root_dir=std::env::var("GUMGANG_ROOT").map(PathBuf::from)
    .unwrap_or(std::env::current_dir().map_err(|e|e.to_string())?);
  let base=match req.root.as_str(){
    "status"=>root_dir.join("gumgang_meeting/status"),
    "ui"=>root_dir.join("gumgang_meeting/ui"),
    "conversations"=>root_dir.join("gumgang_meeting/conversations"),
    "sessions"=>root_dir.join("gumgang_meeting/sessions"),
    _=>return Err("invalid root".into()),
  };
  let target=safe_join(&base,&req.path)?;
  if req.ensureDirs.unwrap_or(true){ if let Some(d)=target.parent(){ fs::create_dir_all(d).map_err(|e|e.to_string())?; } }
  if !req.overwrite.unwrap_or(true)&&target.exists(){ return Err("File exists".into()); }
  fs::write(&target, req.content.as_bytes()).map_err(|e|e.to_string())?;
  Ok(serde_json::json!({ "path": target.to_string_lossy(), "bytes": req.content.len() }))
}

- invoke_handler 등록 배열에 gg_save 추가

    .invoke_handler(tauri::generate_handler![
        greet, read_file, write_file, read_directory, create_directory,
        remove_path, rename_path, path_exists, get_file_info, get_home_dir,
        get_project_root, search_files, grep_in_files, gg_save
    ])

2) tauri.conf.json 수정
- windows[0]에 url 추가, remote 허용

{
  "app": {
    "windows": [
      { "title":"금강 2.0", "width":1400, "height":900, "url":"http://localhost:3037/ui" }
    ],
    "security": { "csp": null, "dangerousRemoteDomain": "localhost" }
  }
}

3) 실행
- 터미널:
  export GUMGANG_ROOT="/home/duksan/바탕화면"
  PORT=3037 node /home/duksan/바탕화면/gumgang_meeting/bridge/server.js   # (실행중이면 생략)
  cargo tauri dev

4) 검증(A4 탭)
- “요약 저장” → status/evidence/ui_runtime_summary_YYYYMMDD_GG-SESS-LOCAL.json
- “p95 측정” → status/evidence/ui_tab_nav_p95_YYYYMMDD_GG-SESS-LOCAL.json
- “에러 스톰” → Runtime Summary 카운트 증가, ui_runtime_YYYYMMDD_*.jsonl 누적

참고
- UI 측 Tauri 감지/라우팅: ui/snapshots/unified_A1-A4_v0/index.html (fetch→invoke 스위치 내장)