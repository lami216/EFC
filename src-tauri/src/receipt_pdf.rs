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

fn ensure_pdf_extension(path: PathBuf) -> PathBuf {
    if path.extension().and_then(|value| value.to_str()).is_some_and(|value| value.eq_ignore_ascii_case("pdf")) {
        return path;
    }
    let parent = path.parent().map(Path::to_path_buf).unwrap_or_default();
    let stem = path.file_stem().and_then(|value| value.to_str()).unwrap_or("EFC-receipt");
    parent.join(format!("{stem}.pdf"))
}

#[tauri::command]
pub fn open_receipt_whatsapp(phone: String, is_certificate: bool) -> Result<(), String> {
    crate::license::require_valid_license()?;
    let url = receipt_whatsapp_url(&phone, is_certificate)?;
    open_whatsapp_url(url.as_str())
}

fn receipt_whatsapp_url(phone: &str, is_certificate: bool) -> Result<tauri::Url, String> {
    if !(7..=15).contains(&phone.len())
        || phone.starts_with('0')
        || !phone.bytes().all(|digit| digit.is_ascii_digit())
    {
        return Err("رقم واتساب غير صالح.".to_string());
    }
    let message = if is_certificate {
        "السلام عليكم، نرفق لكم روسي الشهادة من مركز EFC."
    } else {
        "السلام عليكم، نرفق لكم الروسي من مركز EFC."
    };
    let mut url = tauri::Url::parse(&format!("https://wa.me/{phone}"))
        .map_err(|_| "تعذر تجهيز رابط واتساب.".to_string())?;
    url.query_pairs_mut().append_pair("text", message);
    Ok(url)
}

#[cfg(windows)]
fn open_whatsapp_url(url: &str) -> Result<(), String> {
    use std::{ffi::c_void, ptr};

    #[link(name = "shell32")]
    extern "system" {
        fn ShellExecuteW(
            window: *mut c_void,
            operation: *const u16,
            file: *const u16,
            parameters: *const u16,
            directory: *const u16,
            show: i32,
        ) -> isize;
    }
    let wide_url: Vec<u16> = url.encode_utf16().chain(Some(0)).collect();
    // Windows opens the fixed HTTPS destination using the user's default browser.
    let result = unsafe {
        ShellExecuteW(ptr::null_mut(), ptr::null(), wide_url.as_ptr(), ptr::null(), ptr::null(), 1)
    };
    if result <= 32 {
        return Err("تعذر فتح واتساب في المتصفح.".to_string());
    }
    Ok(())
}

#[cfg(not(windows))]
fn open_whatsapp_url(_url: &str) -> Result<(), String> {
    Err("فتح واتساب من التطبيق متاح على ويندوز.".to_string())
}

#[cfg(test)]
mod tests {
    use super::receipt_whatsapp_url;

    #[test]
    fn builds_targeted_chat_with_single_message() {
        for is_certificate in [false, true] {
            let url = receipt_whatsapp_url("22241234567", is_certificate).unwrap();
            assert_eq!(url.scheme(), "https");
            assert_eq!(url.host_str(), Some("wa.me"));
            assert_eq!(url.path(), "/22241234567");
            let query: Vec<_> = url.query_pairs().collect();
            assert_eq!(query.len(), 1);
            assert_eq!(query[0].0, "text");
            assert_eq!(query[0].1.contains("الشهادة"), is_certificate);
        }
        for bad_phone in ["00000000", "123", "+22241234567", "222/1234567", "٢٢٢٤١٢٣٤٥٦٧"] {
            assert!(receipt_whatsapp_url(bad_phone, false).is_err());
        }
    }
}

#[tauri::command]
pub fn save_receipt_pdf(file_name: String, data_base64: String) -> Result<Option<String>, String> {
    crate::license::require_valid_license()?;
    let bytes = STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|e| format!("تعذر فك بيانات PDF: {e}"))?;
    if !bytes.starts_with(b"%PDF-") {
        return Err("ملف الروسي الناتج ليس PDF صالحًا.".to_string());
    }

    let suggested = sanitize_file_name(&file_name);
    let Some(selected) = rfd::FileDialog::new()
        .add_filter("PDF", &["pdf"])
        .set_file_name(&suggested)
        .save_file()
    else {
        return Ok(None);
    };

    let path = ensure_pdf_extension(selected);
    fs::write(&path, bytes)
        .map_err(|e| format!("تعذر حفظ ملف الروسي: {e}"))?;
    Ok(Some(path.to_string_lossy().into_owned()))
}
