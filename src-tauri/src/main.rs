#![cfg_attr(all(not(debug_assertions), not(test)), windows_subsystem = "windows")]

mod bank_state;
mod certificate_state;
mod license;
mod receipt_pdf;
mod storage;

use bank_state::{load_bank_state, save_bank_state};
use certificate_state::{load_certificate_state, save_certificate_state};
use license::{get_license_device_id, get_license_status, install_license_file};
use receipt_pdf::save_receipt_pdf;
use std::{
    fs,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

fn load_state_raw(app: &tauri::AppHandle) -> Result<Option<String>, String> {
    storage::load_raw(&storage::db_path(app)?, "main", validate_state_json)
}

fn save_state_raw(app: &tauri::AppHandle, state: &str) -> Result<(), String> {
    storage::save_raw(&storage::db_path(app)?, "main", state, validate_state_json)
}

fn validate_state_json(raw: &str) -> Result<(), String> {
    storage::validate_main_state(raw)
}

fn write_safety_backup(app: &tauri::AppHandle) -> Result<(), String> {
    let Some(combined) = storage::read_backup(&storage::db_path(app)?)? else {
        return Ok(());
    };
    let backups = storage::app_data_dir(app)?.join("backups");
    fs::create_dir_all(&backups)
        .map_err(|e| format!("تعذر إنشاء مجلد نسخ الأمان: {e}"))?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("تعذر إنشاء وقت نسخة الأمان: {e}"))?
        .as_nanos();
    storage::atomic_write_backup(&backups.join(format!("auto-before-restore-{stamp}.json")), &combined)?;
    Ok(())
}

#[tauri::command]
fn load_app_state(app: tauri::AppHandle) -> Result<Option<String>, String> {
    license::require_valid_license()?;
    load_state_raw(&app)
}

#[tauri::command]
fn save_app_state(app: tauri::AppHandle, state: String) -> Result<(), String> {
    license::require_valid_license()?;
    validate_state_json(&state)?;
    save_state_raw(&app, &state)
}

#[tauri::command]
fn export_backup(app: tauri::AppHandle, suggested_name: String) -> Result<Option<String>, String> {
    license::require_valid_license()?;
    let database = storage::db_path(&app)?;
    let combined = storage::read_backup(&database)?.ok_or_else(|| format!(
        "تعذر إنشاء النسخة: لا توجد حالة رئيسية محفوظة في {}. لم تُنشأ نسخة فارغة.", database.display()
    ))?;

    let Some(path) = rfd::FileDialog::new()
        .add_filter("EFC data backup", &["json"])
        .set_file_name(&suggested_name)
        .save_file()
    else {
        return Ok(None);
    };

    storage::atomic_write_backup(&path, &combined)?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

#[tauri::command]
fn import_backup(app: tauri::AppHandle) -> Result<Option<String>, String> {
    license::require_valid_license()?;
    let Some(path) = rfd::FileDialog::new()
        .add_filter("EFC data backup", &["json"])
        .pick_file()
    else {
        return Ok(None);
    };

    let state = fs::read_to_string(&path)
        .map_err(|e| format!("تعذر قراءة ملف النسخة: {e}"))?;
    validate_state_json(&state)?;

    // Keep the current database intact. The browser layer merges the selected
    // backup into the current state and then persists the merged result.
    // This safety snapshot is intentionally additive and never deletes older snapshots.
    write_safety_backup(&app)?;
    Ok(Some(state))
}

#[tauri::command]
fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

fn main() {
    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_license_device_id,
            get_license_status,
            install_license_file,
            load_app_state,
            save_app_state,
            export_backup,
            import_backup,
            load_certificate_state,
            save_certificate_state,
            load_bank_state,
            save_bank_state,
            save_receipt_pdf,
            exit_app
        ])
        .build(tauri::generate_context!())
        .expect("error while building Centre EFC");

    app.run(|app_handle, event| {
        if let tauri::RunEvent::WindowEvent { label, event, .. } = event {
            if label != "main" {
                return;
            }
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // The activation window must always remain closable. Once licensed,
                // the frontend flushes pending state before offering the save dialog.
                if license::require_valid_license().is_err() {
                    return;
                }
                api.prevent_close();
                if let Some(window) = app_handle.get_webview_window("main") {
                    if window
                        .eval("if(typeof window.EFC_REQUEST_CLOSE_BACKUP==='function'){window.EFC_REQUEST_CLOSE_BACKUP();}else{window.__TAURI__?.core?.invoke('exit_app');}")
                        .is_err()
                    {
                        app_handle.exit(0);
                    }
                } else {
                    app_handle.exit(0);
                }
            }
        }
    });
}
