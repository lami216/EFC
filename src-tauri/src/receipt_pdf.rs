use base64::{engine::general_purpose::STANDARD, Engine as _};
use std::{fs, path::{Path, PathBuf}};

fn sanitize_file_name(name: &str) -> String {
    let mut cleaned = String::new();
    for ch in name.trim().chars() {
        if ch.is_control() || matches!(ch, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*') {
            cleaned.push('_');
        } else {
            cleaned.push(ch);
        }
    }
    let cleaned = cleaned.trim().trim_end_matches('.').trim();
    let stem = cleaned.strip_suffix(".pdf").unwrap_or(cleaned).trim();
    let stem = if stem.is_empty() { "EFC-receipt" } else { stem };
    format!("{stem}.pdf")
}

fn unique_path(dir: &Path, file_name: &str) -> PathBuf {
    let candidate = dir.join(file_name);
    if !candidate.exists() {
        return candidate;
    }
    let stem = Path::new(file_name)
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("EFC-receipt");
    for index in 2..=9999 {
        let path = dir.join(format!("{stem}-{index}.pdf"));
        if !path.exists() {
            return path;
        }
    }
    dir.join(format!("{stem}-copy.pdf"))
}

#[tauri::command]
pub fn save_receipt_pdf(file_name: String, data_base64: String) -> Result<String, String> {
    crate::license::require_valid_license()?;
    let bytes = STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|e| format!("تعذر فك بيانات PDF: {e}"))?;
    if !bytes.starts_with(b"%PDF-") {
        return Err("ملف الروسي الناتج ليس PDF صالحًا.".to_string());
    }

    let profile = std::env::var_os("USERPROFILE")
        .map(PathBuf::from)
        .ok_or_else(|| "تعذر تحديد مجلد المستخدم في Windows.".to_string())?;
    let downloads = profile.join("Downloads");
    fs::create_dir_all(&downloads)
        .map_err(|e| format!("تعذر الوصول إلى مجلد التنزيلات: {e}"))?;

    let safe_name = sanitize_file_name(&file_name);
    let path = unique_path(&downloads, &safe_name);
    fs::write(&path, bytes)
        .map_err(|e| format!("تعذر حفظ ملف PDF: {e}"))?;
    Ok(path.to_string_lossy().into_owned())
}
