#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection, OptionalExtension};
use std::{fs, path::PathBuf};
use tauri::Manager;

fn db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("تعذر تحديد مجلد بيانات التطبيق: {e}"))?;
    fs::create_dir_all(&dir)
        .map_err(|e| format!("تعذر إنشاء مجلد بيانات التطبيق: {e}"))?;
    Ok(dir.join("efc-state-v1.sqlite"))
}

fn open_db(app: &tauri::AppHandle) -> Result<Connection, String> {
    let conn = Connection::open(db_path(app)?)
        .map_err(|e| format!("تعذر فتح قاعدة البيانات: {e}"))?;
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA synchronous=NORMAL;
         CREATE TABLE IF NOT EXISTS app_state (
             key TEXT PRIMARY KEY NOT NULL,
             value TEXT NOT NULL,
             updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
         );",
    )
    .map_err(|e| format!("تعذر تهيئة قاعدة البيانات: {e}"))?;
    Ok(conn)
}

#[tauri::command]
fn load_app_state(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let conn = open_db(&app)?;
    conn.query_row(
        "SELECT value FROM app_state WHERE key='main'",
        [],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| format!("تعذر قراءة بيانات التطبيق: {e}"))
}

#[tauri::command]
fn save_app_state(app: tauri::AppHandle, state: String) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute(
        "INSERT INTO app_state(key,value,updated_at)
         VALUES('main', ?1, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET
           value=excluded.value,
           updated_at=CURRENT_TIMESTAMP",
        params![state],
    )
    .map_err(|e| format!("تعذر حفظ بيانات التطبيق: {e}"))?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_app_state, save_app_state])
        .run(tauri::generate_context!())
        .expect("error while running Centre EFC");
}
