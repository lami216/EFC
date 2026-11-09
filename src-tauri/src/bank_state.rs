use serde_json::{json, Number, Value};

const BANK_KEY: &str = "bank";

fn bank_next_receipt_no(value: &Value) -> u64 {
    let object = value.as_object();
    let configured = object.and_then(|item| item.get("nextReceiptNo")).and_then(Value::as_u64).filter(|number| *number > 0).unwrap_or(1);
    let max_existing = object.and_then(|item| item.get("entries")).and_then(Value::as_array).map(|entries| {
        entries.iter().filter_map(|entry| entry.get("receiptNo").and_then(Value::as_u64)).max().unwrap_or(0)
    }).unwrap_or(0);
    configured.max(max_existing.saturating_add(1)).max(1)
}

pub fn validate_bank_state(raw: &str) -> Result<(), String> {
    let value: Value = serde_json::from_str(raw).map_err(|_| "بيانات البنك ليست JSON صالحًا.".to_string())?;
    let object = value.as_object().ok_or_else(|| "بيانات البنك غير صالحة.".to_string())?;
    for key in ["entries", "tombstones"] {
        if !object.get(key).is_some_and(Value::is_array) {
            return Err(format!("بيانات البنك ناقصة أو غير صالحة: {key}"));
        }
    }
    if let Some(next) = object.get("nextReceiptNo") {
        if !next.as_u64().is_some_and(|number| number > 0) {
            return Err("بيانات البنك تحتوي عداد روسيات غير صالح.".to_string());
        }
    }
    Ok(())
}

pub fn load_raw(app: &tauri::AppHandle) -> Result<Option<String>, String> {
    crate::storage::load_auxiliary(&crate::storage::db_path(app)?, BANK_KEY, validate_bank_state, state_from_main_value)
}

pub fn save_raw(app: &tauri::AppHandle, state: &str) -> Result<(), String> {
    crate::storage::save_raw(&crate::storage::db_path(app)?, BANK_KEY, state, validate_bank_state)
}

pub fn state_from_main_value(main: &Value) -> Result<Option<String>, String> {
    if !["bankEntries", "bankTombstones", "bankNextReceiptNo"].iter().any(|key| main.get(*key).is_some()) {
        return Ok(None);
    }
    let mut bank = json!({
        "entries": main.get("bankEntries").cloned().unwrap_or_else(|| json!([])),
        "tombstones": main.get("bankTombstones").cloned().unwrap_or_else(|| json!([])),
        "nextReceiptNo": main.get("bankNextReceiptNo").cloned().unwrap_or_else(|| json!(1))
    });
    validate_bank_state(&bank.to_string())?;
    let next = bank_next_receipt_no(&bank);
    bank["nextReceiptNo"] = Value::Number(Number::from(next));
    Ok(Some(bank.to_string()))
}

pub fn merge_into_main_value(main: &mut Value, bank_raw: Option<&str>) -> Result<(), String> {
    // A legacy database may contain this section only in main. Absence of a
    // separate bank key must not overwrite that existing data with empty arrays.
    let Some(bank_raw) = bank_raw else { return Ok(()); };
    validate_bank_state(bank_raw)?;
    let bank: Value = serde_json::from_str(bank_raw).map_err(|_| "بيانات البنك ليست JSON صالحًا.".to_string())?;
    let Some(object) = main.as_object_mut() else { return Err("بيانات EFC الرئيسية غير صالحة.".to_string()); };
    let bank_object = bank.as_object().ok_or_else(|| "بيانات البنك غير صالحة.".to_string())?;
    for (target, source) in [("bankEntries", "entries"), ("bankTombstones", "tombstones")] {
        let value = bank_object.get(source).ok_or_else(|| format!("بيانات البنك ناقصة: {source}"))?;
        object.insert(target.to_string(), value.clone());
    }
    object.insert("bankNextReceiptNo".to_string(), Value::Number(Number::from(bank_next_receipt_no(&bank))));
    Ok(())
}

#[tauri::command]
pub fn load_bank_state(app: tauri::AppHandle) -> Result<Option<String>, String> {
    crate::license::require_valid_license()?;
    load_raw(&app)
}

#[tauri::command]
pub fn save_bank_state(app: tauri::AppHandle, state: String) -> Result<(), String> {
    crate::license::require_valid_license()?;
    save_raw(&app, &state)
}
