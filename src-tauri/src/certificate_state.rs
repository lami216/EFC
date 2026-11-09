use serde_json::{json, Number, Value};

const CERT_KEY: &str = "certificates";

fn certificate_next_receipt_no(value: &Value) -> u64 {
    let object = value.as_object();
    let configured = object
        .and_then(|item| item.get("nextReceiptNo"))
        .and_then(Value::as_u64)
        .filter(|number| *number > 0)
        .unwrap_or(1);
    let max_existing = object
        .and_then(|item| item.get("certificateReceipts"))
        .and_then(Value::as_array)
        .map(|receipts| {
            receipts
                .iter()
                .filter_map(|receipt| receipt.get("receiptNo").and_then(Value::as_u64))
                .max()
                .unwrap_or(0)
        })
        .unwrap_or(0);
    configured.max(max_existing.saturating_add(1)).max(1)
}

pub fn validate_certificate_state(raw: &str) -> Result<(), String> {
    let value: Value = serde_json::from_str(raw)
        .map_err(|_| "بيانات الشهادات ليست JSON صالحًا.".to_string())?;
    let object = value
        .as_object()
        .ok_or_else(|| "بيانات الشهادات غير صالحة.".to_string())?;
    for key in ["certificateBranches", "certificateReceipts"] {
        if !object.get(key).is_some_and(Value::is_array) {
            return Err(format!("بيانات الشهادات ناقصة أو غير صالحة: {key}"));
        }
    }
    if let Some(next) = object.get("nextReceiptNo") {
        if !next.as_u64().is_some_and(|number| number > 0) {
            return Err("بيانات الشهادات تحتوي عداد روسيات غير صالح.".to_string());
        }
    }
    Ok(())
}

pub fn load_raw(app: &tauri::AppHandle) -> Result<Option<String>, String> {
    crate::storage::load_auxiliary(&crate::storage::db_path(app)?, CERT_KEY, validate_certificate_state, state_from_main_value)
}

pub fn save_raw(app: &tauri::AppHandle, state: &str) -> Result<(), String> {
    crate::storage::save_raw(&crate::storage::db_path(app)?, CERT_KEY, state, validate_certificate_state)
}

pub fn state_from_main_value(main: &Value) -> Result<Option<String>, String> {
    if !["certificateBranches", "certificateReceipts", "certificateNextReceiptNo"].iter().any(|key| main.get(*key).is_some()) {
        return Ok(None);
    }
    let mut cert = json!({
        "certificateBranches": main.get("certificateBranches").cloned().unwrap_or_else(|| json!([])),
        "certificateReceipts": main.get("certificateReceipts").cloned().unwrap_or_else(|| json!([])),
        "nextReceiptNo": main.get("certificateNextReceiptNo").cloned().unwrap_or_else(|| json!(1))
    });
    validate_certificate_state(&cert.to_string())?;
    let next = certificate_next_receipt_no(&cert);
    cert["nextReceiptNo"] = Value::Number(Number::from(next));
    Ok(Some(cert.to_string()))
}

pub fn merge_into_main_value(main: &mut Value, certificate_raw: Option<&str>) -> Result<(), String> {
    // Preserve sections embedded in legacy main snapshots when no dedicated key
    // exists; malformed dedicated data is an error rather than an empty section.
    let Some(certificate_raw) = certificate_raw else { return Ok(()); };
    validate_certificate_state(certificate_raw)?;
    let cert: Value = serde_json::from_str(certificate_raw)
        .map_err(|_| "بيانات الشهادات ليست JSON صالحًا.".to_string())?;
    let Some(object) = main.as_object_mut() else {
        return Err("بيانات EFC الرئيسية غير صالحة.".to_string());
    };

    let cert_object = cert.as_object().ok_or_else(|| "بيانات الشهادات غير صالحة.".to_string())?;
    for key in ["certificateBranches", "certificateReceipts"] {
        let value = cert_object.get(key).ok_or_else(|| format!("بيانات الشهادات ناقصة: {key}"))?;
        object.insert(key.to_string(), value.clone());
    }
    object.insert(
        "certificateNextReceiptNo".to_string(),
        Value::Number(Number::from(certificate_next_receipt_no(&cert))),
    );

    Ok(())
}

#[tauri::command]
pub fn load_certificate_state(app: tauri::AppHandle) -> Result<Option<String>, String> {
    crate::license::require_valid_license()?;
    load_raw(&app)
}

#[tauri::command]
pub fn save_certificate_state(app: tauri::AppHandle, state: String) -> Result<(), String> {
    crate::license::require_valid_license()?;
    save_raw(&app, &state)
}
