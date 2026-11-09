use rusqlite::{params, Connection, OpenFlags, OptionalExtension, TransactionBehavior};
use serde_json::Value;
use std::{
    fs::{self, File, OpenOptions},
    io::{self, Write},
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

const DB_NAME: &str = "efc-state-v1.sqlite";
const CREATE_STATE_TABLE: &str = "CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);";
type Validator = fn(&str) -> Result<(), String>;
static NEXT_TEMP: AtomicU64 = AtomicU64::new(0);

pub fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    // Resolving a read path must never create a replacement database or directory.
    app.path()
        .app_data_dir()
        .map_err(|error| format!("تعذر تحديد مجلد بيانات التطبيق: {error}"))
}

pub fn db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join(DB_NAME))
}

fn sqlite_error(path: &Path, stage: &str, error: rusqlite::Error) -> String {
    match &error {
        rusqlite::Error::SqliteFailure(code, _) => format!(
            "تعذر تنفيذ عملية قاعدة البيانات [المرحلة: {stage}; المسار: {}; SQLite primary={}; extended={}]: {error}",
            path.display(), code.extended_code & 0xff, code.extended_code
        ),
        _ => format!(
            "تعذر تنفيذ عملية قاعدة البيانات [المرحلة: {stage}; المسار: {}]: {error}",
            path.display()
        ),
    }
}

fn io_error(path: &Path, stage: &str, error: io::Error) -> String {
    format!(
        "تعذر تنفيذ عملية ملف [المرحلة: {stage}; المسار: {}; OS={:?}]: {error}",
        path.display(), error.raw_os_error()
    )
}

fn invalid_state(path: &Path, stage: &str, error: String) -> String {
    format!("تعذر التحقق من البيانات [المرحلة: {stage}; المسار: {}]: {error}", path.display())
}

fn open_existing(path: &Path) -> Result<Option<Connection>, String> {
    if !path.try_exists().map_err(|error| io_error(path, "فحص وجود قاعدة البيانات", error))? {
        return Ok(None);
    }
    // No CREATE, journal-mode change, schema initialization, or writable fallback.
    Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map(Some)
        .map_err(|error| sqlite_error(path, "فتح قاعدة موجودة للقراءة فقط", error))
}

fn open_for_write(path: &Path) -> Result<Connection, String> {
    let existed = path.try_exists().map_err(|error| io_error(path, "فحص قاعدة البيانات قبل الحفظ", error))?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| io_error(parent, "إنشاء مجلد بيانات التطبيق", error))?;
    }
    let conn = Connection::open(path).map_err(|error| sqlite_error(path, "فتح قاعدة البيانات للحفظ", error))?;
    // Retain the previous durability setting for writes, without resetting an
    // existing database's persistent journal mode on every operation.
    conn.pragma_update(None, "synchronous", "NORMAL")
        .map_err(|error| sqlite_error(path, "ضبط اتصال الحفظ", error))?;
    if !existed {
        conn.pragma_update(None, "journal_mode", "WAL")
            .map_err(|error| sqlite_error(path, "تهيئة WAL لقاعدة جديدة", error))?;
    }
    let has_table: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='app_state')",
        [], |row| row.get(0),
    ).map_err(|error| sqlite_error(path, "فحص جدول الحالة قبل الحفظ", error))?;
    if !has_table {
        conn.execute_batch(CREATE_STATE_TABLE)
            .map_err(|error| sqlite_error(path, "إنشاء جدول الحالة عند أول حفظ", error))?;
    }
    Ok(conn)
}

fn read_row(conn: &Connection, path: &Path, key: &str) -> Result<Option<String>, String> {
    conn.query_row("SELECT value FROM app_state WHERE key=?1", params![key], |row| row.get(0))
        .optional()
        .map_err(|error| sqlite_error(path, &format!("قراءة الحالة {key}"), error))
}

pub fn load_raw(path: &Path, key: &str, validate: Validator) -> Result<Option<String>, String> {
    let Some(conn) = open_existing(path)? else { return Ok(None); };
    let raw = read_row(&conn, path, key)?;
    if let Some(raw) = &raw {
        validate(raw).map_err(|error| invalid_state(path, &format!("فحص الحالة المقروءة {key}"), error))?;
    }
    Ok(raw)
}

pub fn load_auxiliary(
    path: &Path,
    key: &str,
    validate: Validator,
    from_main: fn(&Value) -> Result<Option<String>, String>,
) -> Result<Option<String>, String> {
    let Some(mut conn) = open_existing(path)? else { return Ok(None); };
    let tx = conn.transaction().map_err(|error| sqlite_error(path, &format!("بدء قراءة القسم {key}"), error))?;
    let raw = if let Some(raw) = read_row(&tx, path, key)? {
        // A malformed dedicated section must never be replaced by a fallback.
        Some(raw)
    } else if let Some(main) = read_row(&tx, path, "main")? {
        validate_main_state(&main).map_err(|error| invalid_state(path, &format!("فحص main لتحميل القسم القديم {key}"), error))?;
        let value: Value = serde_json::from_str(&main)
            .map_err(|error| invalid_state(path, &format!("قراءة main لتحميل القسم القديم {key}"), error.to_string()))?;
        from_main(&value).map_err(|error| invalid_state(path, &format!("تحميل القسم القديم {key}"), error))?
    } else { None };
    if let Some(raw) = &raw {
        validate(raw).map_err(|error| invalid_state(path, &format!("فحص القسم المقروء {key}"), error))?;
    }
    tx.commit().map_err(|error| sqlite_error(path, &format!("إنهاء قراءة القسم {key}"), error))?;
    Ok(raw)
}

pub fn save_raw(path: &Path, key: &str, raw: &str, validate: Validator) -> Result<(), String> {
    validate(raw).map_err(|error| invalid_state(path, &format!("فحص الحالة الجديدة {key}"), error))?;
    let mut conn = open_for_write(path)?;
    let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|error| sqlite_error(path, &format!("بدء حفظ الحالة {key}"), error))?;
    // A failed native load must not let an automatic local-cache fallback erase
    // an unreadable existing row. Recovery is never performed implicitly here.
    let existing = read_row(&tx, path, key)?;
    if let Some(existing) = &existing {
        validate(existing).map_err(|error| invalid_state(path, &format!("حماية الحالة الموجودة {key} قبل الحفظ"), error))?;
    }
    let saved = if key == "main" {
        preserve_unmigrated_sections(&tx, path, raw, existing.as_deref())?
    } else { raw.to_string() };
    tx.execute(
        "INSERT INTO app_state(key,value,updated_at) VALUES(?1,?2,CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP",
        params![key, saved],
    ).map_err(|error| sqlite_error(path, &format!("كتابة الحالة {key}"), error))?;
    tx.commit().map_err(|error| sqlite_error(path, &format!("تثبيت الحالة {key}"), error))
}

fn preserve_unmigrated_sections(conn: &Connection, path: &Path, incoming: &str, existing: Option<&str>) -> Result<String, String> {
    let Some(existing) = existing else { return Ok(incoming.to_string()); };
    let old: Value = serde_json::from_str(existing)
        .map_err(|error| invalid_state(path, "قراءة أقسام main القديمة قبل الحفظ", error.to_string()))?;
    let mut value: Value = serde_json::from_str(incoming)
        .map_err(|error| invalid_state(path, "قراءة main الجديد قبل الحفظ", error.to_string()))?;
    for (key, fields) in [
        ("bank", ["bankEntries", "bankTombstones", "bankNextReceiptNo"]),
        ("certificates", ["certificateBranches", "certificateReceipts", "certificateNextReceiptNo"]),
    ] {
        // Early bootstrap saves may precede an auxiliary module's first load.
        // Until its dedicated row exists, absent fields mean "not loaded yet",
        // while explicit values from the caller continue to win unchanged.
        if read_row(conn, path, key)?.is_none() {
            for field in fields {
                if value.get(field).is_none() {
                    if let Some(previous) = old.get(field) { value[field] = previous.clone(); }
                }
            }
        }
    }
    serde_json::to_string(&value)
        .map_err(|error| invalid_state(path, "حفظ أقسام main القديمة دون فقد", error.to_string()))
}

pub fn validate_main_state(raw: &str) -> Result<(), String> {
    let value: Value = serde_json::from_str(raw)
        .map_err(|_| "ملف النسخة ليس ملف JSON صالحًا.".to_string())?;
    let object = value.as_object().ok_or_else(|| "ملف النسخة لا يحتوي بيانات EFC صالحة.".to_string())?;
    for key in ["students", "specialties", "paymentMethods"] {
        if !object.get(key).is_some_and(Value::is_array) {
            return Err(format!("ملف النسخة ناقص أو غير صالح: {key}"));
        }
    }
    for key in ["certificateBranches", "certificateReceipts", "bankEntries", "bankTombstones"] {
        if object.get(key).is_some_and(|value| !value.is_array()) {
            return Err(format!("ملف النسخة يحتوي بيانات غير صالحة: {key}"));
        }
    }
    if let Some(value) = object.get("bankNextReceiptNo") {
        if !value.as_u64().is_some_and(|number| number > 0) {
            return Err("ملف النسخة يحتوي عداد روسيات بنك غير صالح.".to_string());
        }
    }
    Ok(())
}

fn backup_from_connection(conn: &Connection, path: &Path) -> Result<Option<String>, String> {
    let main = read_row(conn, path, "main")?;
    let certificates = read_row(conn, path, "certificates")?;
    let bank = read_row(conn, path, "bank")?;
    let Some(main) = main else {
        if certificates.is_some() || bank.is_some() {
            return Err(invalid_state(path, "قراءة لقطة النسخة", "الحالة الرئيسية مفقودة مع وجود أقسام أخرى؛ لم تُنشأ نسخة ناقصة.".to_string()));
        }
        return Ok(None);
    };
    validate_main_state(&main).map_err(|error| invalid_state(path, "فحص الحالة الرئيسية للنسخة", error))?;
    let mut combined: Value = serde_json::from_str(&main)
        .map_err(|error| invalid_state(path, "قراءة JSON الرئيسي للنسخة", error.to_string()))?;
    crate::certificate_state::merge_into_main_value(&mut combined, certificates.as_deref())
        .map_err(|error| invalid_state(path, "فحص قسم الشهادات للنسخة", error))?;
    crate::bank_state::merge_into_main_value(&mut combined, bank.as_deref())
        .map_err(|error| invalid_state(path, "فحص قسم البنك للنسخة", error))?;
    let raw = serde_json::to_string(&combined)
        .map_err(|error| invalid_state(path, "تجهيز JSON النسخة", error.to_string()))?;
    validate_main_state(&raw).map_err(|error| invalid_state(path, "فحص النسخة المجمعة", error))?;
    Ok(Some(raw))
}

pub fn read_backup(path: &Path) -> Result<Option<String>, String> {
    let Some(mut conn) = open_existing(path)? else { return Ok(None); };
    // All three keys come from one SQLite read snapshot, including when another
    // application process writes while this export is being prepared.
    let tx = conn.transaction().map_err(|error| sqlite_error(path, "بدء لقطة قراءة النسخة", error))?;
    let raw = backup_from_connection(&tx, path)?;
    tx.commit().map_err(|error| sqlite_error(path, "إنهاء لقطة قراءة النسخة", error))?;
    Ok(raw)
}

struct TemporaryBackup {
    path: PathBuf,
    file: Option<File>,
}
impl Drop for TemporaryBackup {
    fn drop(&mut self) {
        self.file.take();
        // Only the unique file created by this operation is ever cleaned up.
        let _ = fs::remove_file(&self.path);
    }
}

fn temporary_backup(target: &Path) -> Result<TemporaryBackup, String> {
    let parent = target.parent().unwrap_or_else(|| Path::new("."));
    let stamp = SystemTime::now().duration_since(UNIX_EPOCH)
        .map_err(|error| invalid_state(target, "إنشاء اسم مؤقت للنسخة", error.to_string()))?.as_nanos();
    for _ in 0..16 {
        let sequence = NEXT_TEMP.fetch_add(1, Ordering::Relaxed);
        let path = parent.join(format!(".efc-backup-{}-{stamp}-{sequence}.tmp", std::process::id()));
        match OpenOptions::new().write(true).create_new(true).open(&path) {
            Ok(file) => return Ok(TemporaryBackup { path, file: Some(file) }),
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(io_error(&path, "إنشاء الملف المؤقت للنسخة", error)),
        }
    }
    Err(invalid_state(target, "إنشاء الملف المؤقت للنسخة", "تعذر حجز اسم مؤقت فريد.".to_string()))
}

fn atomic_write_with<F>(target: &Path, raw: &str, write: F) -> Result<(), String>
where F: FnOnce(&mut File, &[u8]) -> io::Result<()> {
    validate_main_state(raw).map_err(|error| invalid_state(target, "فحص النسخة قبل الكتابة", error))?;
    let mut temporary = temporary_backup(target)?;
    let file = temporary.file.as_mut().expect("new temporary backup has a file");
    write(file, raw.as_bytes()).map_err(|error| io_error(&temporary.path, "كتابة النسخة المؤقتة", error))?;
    file.flush().map_err(|error| io_error(&temporary.path, "تفريغ كتابة النسخة المؤقتة", error))?;
    file.sync_all().map_err(|error| io_error(&temporary.path, "مزامنة النسخة المؤقتة مع القرص", error))?;
    temporary.file.take();
    let verified = fs::read(&temporary.path).map_err(|error| io_error(&temporary.path, "قراءة النسخة المؤقتة للتحقق", error))?;
    if verified != raw.as_bytes() {
        return Err(invalid_state(&temporary.path, "مقارنة النسخة المؤقتة", "محتوى الملف لا يطابق البيانات المطلوبة؛ بقيت النسخة السابقة دون استبدال.".to_string()));
    }
    // The temporary file is a sibling, so rename cannot become a cross-volume
    // copy. Never delete/truncate the old destination before this atomic replace.
    fs::rename(&temporary.path, target).map_err(|error| io_error(target, "اعتماد النسخة واستبدال الملف ذريًا", error))?;
    Ok(())
}

pub fn atomic_write_backup(target: &Path, raw: &str) -> Result<(), String> {
    atomic_write_with(target, raw, |file, bytes| file.write_all(bytes))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    struct TestDirectory(PathBuf);
    impl TestDirectory {
        fn new() -> Self {
            let stamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
            let sequence = NEXT_TEMP.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir().join(format!("efc-storage-test-{}-{stamp}-{sequence}", std::process::id()));
            fs::create_dir(&path).unwrap();
            Self(path)
        }
        fn database(&self) -> PathBuf { self.0.join(DB_NAME) }
        fn assert_no_temporary_files(&self) {
            assert!(fs::read_dir(&self.0).unwrap().all(|entry| !entry.unwrap().file_name().to_string_lossy().starts_with(".efc-backup-")));
        }
    }
    impl Drop for TestDirectory {
        fn drop(&mut self) {
            // Only this test's newly created, explicitly named temporary root.
            if self.0.parent() == Some(std::env::temp_dir().as_path())
                && self.0.file_name().unwrap().to_string_lossy().starts_with("efc-storage-test-") {
                let _ = fs::remove_dir_all(&self.0);
            }
        }
    }
    fn main_state(epoch: u64) -> String {
        json!({"version":3,"updatedAt":epoch,"students":[{"id":"طالب-1","recordCode":"r1","payments":[["2026-11-01",500,"نقداً","12:00",1,"","tx-1",null,17]]}],"specialties":[],"paymentMethods":["نقداً"],"unknownLegacyField":{"preserve":true}}).to_string()
    }
    fn certificates(epoch: u64) -> String {
        json!({"certificateBranches":[{"id":"c1","name":format!("مركز {epoch}")}],"certificateReceipts":[{"id":"cert1","recordCode":"cert-r1","receiptNo":epoch+10,"amount":300}],"nextReceiptNo":1}).to_string()
    }
    fn bank(epoch: u64) -> String {
        json!({"entries":[{"id":"bank1","recordCode":"bank-r1","receiptNo":epoch+20,"amount":epoch}],"tombstones":[{"recordCode":"deleted-1","deletedAt":9}],"nextReceiptNo":1}).to_string()
    }
    fn seed(path: &Path, epoch: u64) {
        save_raw(path, "main", &main_state(epoch), validate_main_state).unwrap();
        save_raw(path, "certificates", &certificates(epoch), crate::certificate_state::validate_certificate_state).unwrap();
        save_raw(path, "bank", &bank(epoch), crate::bank_state::validate_bank_state).unwrap();
    }
    fn rollback_database(path: &Path, main: &str) {
        let conn = Connection::open(path).unwrap();
        conn.execute_batch(CREATE_STATE_TABLE).unwrap();
        conn.execute("INSERT INTO app_state(key,value) VALUES('main',?1)", params![main]).unwrap();
    }
    fn parse(raw: Option<String>) -> Value { serde_json::from_str(&raw.unwrap()).unwrap() }

    #[test]
    fn missing_database_reads_never_create_a_file_or_parent() {
        let dir = TestDirectory::new();
        let path = dir.0.join("not-created").join(DB_NAME);
        assert!(load_raw(&path, "main", validate_main_state).unwrap().is_none());
        assert!(read_backup(&path).unwrap().is_none());
        assert!(!path.parent().unwrap().exists());
    }

    #[test]
    fn existing_reads_preserve_database_bytes_schema_and_journal_mode() {
        let dir = TestDirectory::new();
        let path = dir.database();
        let state = main_state(1);
        rollback_database(&path, &state);
        let before = fs::read(&path).unwrap();
        assert_eq!(load_raw(&path, "main", validate_main_state).unwrap().unwrap(), state);
        assert_eq!(parse(read_backup(&path).unwrap()), serde_json::from_str::<Value>(&state).unwrap());
        assert_eq!(fs::read(&path).unwrap(), before);
        assert!(!dir.0.join(format!("{DB_NAME}-wal")).exists());
        let conn = open_existing(&path).unwrap().unwrap();
        let mode: String = conn.pragma_query_value(None, "journal_mode", |row| row.get(0)).unwrap();
        assert_eq!(mode, "delete");
        assert!(conn.execute("CREATE TABLE unexpected(value TEXT)", []).is_err(), "ordinary connections really are read-only");
    }

    #[test]
    fn existing_read_only_file_can_be_exported_without_schema_or_wal_initialization() {
        let dir = TestDirectory::new();
        let path = dir.database();
        rollback_database(&path, &main_state(1));
        let permissions = fs::metadata(&path).unwrap().permissions();
        let mut read_only = permissions.clone();
        read_only.set_readonly(true);
        fs::set_permissions(&path, read_only).unwrap();
        let loaded = load_raw(&path, "main", validate_main_state);
        let exported = read_backup(&path);
        fs::set_permissions(&path, permissions).unwrap();
        assert_eq!(loaded.unwrap().unwrap(), main_state(1));
        assert_eq!(parse(exported.unwrap())["updatedAt"], 1);
        assert!(!dir.0.join(format!("{DB_NAME}-wal")).exists());
    }

    #[test]
    fn non_sqlite_file_fails_without_being_reset_or_replaced() {
        let dir = TestDirectory::new();
        let path = dir.database();
        let original = b"synthetic invalid database bytes: do not reset";
        fs::write(&path, original).unwrap();
        let error = load_raw(&path, "main", validate_main_state).unwrap_err();
        assert!(error.contains("primary=26") && error.contains(path.to_str().unwrap()), "{error}");
        assert!(read_backup(&path).is_err());
        assert!(save_raw(&path, "main", &main_state(1), validate_main_state).is_err());
        assert_eq!(fs::read(&path).unwrap(), original);
    }

    #[test]
    fn reads_do_not_reinitialize_an_existing_database_with_missing_schema() {
        let dir = TestDirectory::new();
        let path = dir.database();
        let conn = Connection::open(&path).unwrap();
        conn.execute_batch("CREATE TABLE legacy_notes(value TEXT); INSERT INTO legacy_notes VALUES('keep me');").unwrap();
        drop(conn);
        let before = fs::read(&path).unwrap();
        let error = load_raw(&path, "main", validate_main_state).unwrap_err();
        assert!(error.contains("قراءة الحالة main") && error.contains("primary=1") && error.contains(path.to_str().unwrap()));
        assert!(read_backup(&path).is_err());
        assert_eq!(fs::read(&path).unwrap(), before);
        let conn = Connection::open(&path).unwrap();
        assert_eq!(conn.query_row("SELECT value FROM legacy_notes", [], |row| row.get::<_, String>(0)).unwrap(), "keep me");
        assert_eq!(conn.query_row("SELECT count(*) FROM sqlite_master WHERE name='app_state'", [], |row| row.get::<_, u64>(0)).unwrap(), 0);
    }

    #[test]
    fn explicit_first_save_initializes_storage_and_preserves_other_tables() {
        let dir = TestDirectory::new();
        let path = dir.database();
        let conn = Connection::open(&path).unwrap();
        conn.execute_batch("CREATE TABLE legacy_notes(value TEXT); INSERT INTO legacy_notes VALUES('keep me');").unwrap();
        drop(conn);
        seed(&path, 1);
        assert_eq!(load_raw(&path, "main", validate_main_state).unwrap().unwrap(), main_state(1));
        let conn = Connection::open(&path).unwrap();
        assert_eq!(conn.query_row("SELECT value FROM legacy_notes", [], |row| row.get::<_, String>(0)).unwrap(), "keep me");
        assert_eq!(conn.pragma_query_value(None, "journal_mode", |row| row.get::<_, String>(0)).unwrap(), "delete", "saving an existing legacy database does not reset its journal mode");
    }

    #[test]
    fn combined_backup_preserves_identities_and_uses_dedicated_sections_and_counters() {
        let dir = TestDirectory::new();
        let path = dir.database();
        seed(&path, 1);
        let before = load_raw(&path, "main", validate_main_state).unwrap();
        let combined = parse(read_backup(&path).unwrap());
        let original: Value = serde_json::from_str(before.as_ref().unwrap()).unwrap();
        assert_eq!(combined["students"], original["students"]);
        assert_eq!(combined["unknownLegacyField"], original["unknownLegacyField"]);
        assert_eq!(combined["bankEntries"][0]["recordCode"], "bank-r1");
        assert_eq!(combined["bankTombstones"][0]["recordCode"], "deleted-1");
        assert_eq!(combined["bankNextReceiptNo"], 22);
        assert_eq!(combined["certificateReceipts"][0]["recordCode"], "cert-r1");
        assert_eq!(combined["certificateNextReceiptNo"], 12);
        assert_eq!(load_raw(&path, "main", validate_main_state).unwrap(), before);
    }

    #[test]
    fn missing_dedicated_sections_preserve_valid_legacy_inline_data() {
        let dir = TestDirectory::new();
        let path = dir.database();
        let mut original: Value = serde_json::from_str(&main_state(1)).unwrap();
        original["bankEntries"] = json!([{"id":"legacy-bank","receiptNo":99}]);
        original["bankTombstones"] = json!([{"recordCode":"legacy-deleted"}]);
        original["bankNextReceiptNo"] = json!(100);
        original["certificateBranches"] = json!([{"id":"legacy-branch"}]);
        original["certificateReceipts"] = json!([{"id":"legacy-cert","receiptNo":77}]);
        original["certificateNextReceiptNo"] = json!(78);
        rollback_database(&path, &original.to_string());
        assert_eq!(parse(read_backup(&path).unwrap()), original);
        // Optional legacy sections remain optional; valid old core-only JSON loads.
        let other = dir.0.join("legacy-core.sqlite");
        rollback_database(&other, &main_state(2));
        assert!(load_raw(&other, "main", validate_main_state).unwrap().is_some());
    }

    #[test]
    fn legacy_inline_sections_survive_native_load_then_frontend_startup_save_then_export() {
        let dir = TestDirectory::new();
        let path = dir.database();
        let mut original: Value = serde_json::from_str(&main_state(1)).unwrap();
        original["bankEntries"] = json!([{"id":"legacy-bank","recordCode":"legacy-bank-r","receiptNo":99,"amount":500,"statement":"إيداع قديم","type":"in","date":"2026-10-01","time":"12:00","createdAt":1,"updatedAt":2}]);
        original["bankTombstones"] = json!([{"recordCode":"legacy-deleted","deletedAt":8}]);
        original["bankNextReceiptNo"] = json!(200);
        original["certificateBranches"] = json!([{"id":"legacy-branch","recordCode":"legacy-branch-r","name":"مركز قديم","createdAt":1,"updatedAt":2,"deletedAt":0}]);
        original["certificateReceipts"] = json!([{"id":"legacy-cert","recordCode":"legacy-cert-r","transactionCode":"legacy-cert-tx","receiptNo":77,"studentName":"طالب قديم","amount":300,"studentType":"external","specialtyName":"الفرنسية","branchType":"certificate","branchId":"legacy-branch","date":"2026-10-01","time":"12:00","createdAt":1,"updatedAt":2}]);
        original["certificateNextReceiptNo"] = json!(300);
        rollback_database(&path, &original.to_string());
        // A core save can run before the auxiliary modules have registered their
        // snapshot contributors. Missing fields must not erase inline records.
        save_raw(&path, "main", &main_state(2), validate_main_state).unwrap();
        original["updatedAt"] = json!(2);
        // The real frontend saves its loaded state during startup, even with an
        // empty browser cache. Loading None here used to create empty aux rows.
        let bank = load_auxiliary(&path, "bank", crate::bank_state::validate_bank_state, crate::bank_state::state_from_main_value).unwrap().unwrap();
        save_raw(&path, "bank", &bank, crate::bank_state::validate_bank_state).unwrap();
        let cert = load_auxiliary(&path, "certificates", crate::certificate_state::validate_certificate_state, crate::certificate_state::state_from_main_value).unwrap().unwrap();
        save_raw(&path, "certificates", &cert, crate::certificate_state::validate_certificate_state).unwrap();
        assert_eq!(parse(read_backup(&path).unwrap()), original);
        assert_eq!(load_raw(&path, "main", validate_main_state).unwrap().unwrap(), original.to_string());
    }

    #[test]
    fn early_main_save_preserves_legacy_sections_but_respects_explicit_values() {
        let dir = TestDirectory::new();
        let path = dir.database();
        let mut original: Value = serde_json::from_str(&main_state(1)).unwrap();
        original["bankEntries"] = json!([{"id":"old-bank","receiptNo":7}]);
        original["bankTombstones"] = json!([{"recordCode":"deleted"}]);
        original["bankNextReceiptNo"] = json!(8);
        rollback_database(&path, &original.to_string());
        let mut incoming: Value = serde_json::from_str(&main_state(2)).unwrap();
        incoming["bankEntries"] = json!([]); // A deliberate value is not absence.
        save_raw(&path, "main", &incoming.to_string(), validate_main_state).unwrap();
        let saved = parse(load_raw(&path, "main", validate_main_state).unwrap());
        assert_eq!(saved["bankEntries"], json!([]));
        assert_eq!(saved["bankTombstones"], original["bankTombstones"]);
        assert_eq!(saved["bankNextReceiptNo"], 8);
        assert_eq!(saved["updatedAt"], 2);
    }

    #[test]
    fn malformed_existing_rows_fail_load_export_and_automatic_overwrite_without_data_loss() {
        let cases: [(&str, Validator, String); 3] = [
            ("main", validate_main_state, main_state(1)),
            ("certificates", crate::certificate_state::validate_certificate_state, certificates(1)),
            ("bank", crate::bank_state::validate_bank_state, bank(1)),
        ];
        for (key, validate, valid) in cases {
            for invalid in ["{broken", "{\"wrong-shape\":[]}"] {
                let dir = TestDirectory::new();
                let path = dir.database();
                rollback_database(&path, &main_state(1));
                let conn = Connection::open(&path).unwrap();
                conn.execute("INSERT INTO app_state(key,value) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value", params![key, invalid]).unwrap();
                drop(conn);
                let before = fs::read(&path).unwrap();
                assert!(load_raw(&path, key, validate).is_err());
                if key == "bank" {
                    assert!(load_auxiliary(&path, key, validate, crate::bank_state::state_from_main_value).is_err());
                } else if key == "certificates" {
                    assert!(load_auxiliary(&path, key, validate, crate::certificate_state::state_from_main_value).is_err());
                } else {
                    assert!(load_auxiliary(&path, "bank", crate::bank_state::validate_bank_state, crate::bank_state::state_from_main_value).is_err());
                }
                assert!(read_backup(&path).is_err());
                assert!(save_raw(&path, key, &valid, validate).is_err());
                assert_eq!(fs::read(&path).unwrap(), before);
                let conn = Connection::open(&path).unwrap();
                assert_eq!(read_row(&conn, &path, key).unwrap().unwrap(), invalid);
            }
        }
    }

    #[test]
    fn backup_refuses_a_partial_database_without_main() {
        let dir = TestDirectory::new();
        let path = dir.database();
        save_raw(&path, "bank", &bank(1), crate::bank_state::validate_bank_state).unwrap();
        assert!(read_backup(&path).unwrap_err().contains("الحالة الرئيسية مفقودة"));
        assert!(load_raw(&path, "main", validate_main_state).unwrap().is_none());
    }

    #[test]
    fn all_sections_are_read_from_one_sqlite_snapshot_during_another_writer_commit() {
        let dir = TestDirectory::new();
        let path = dir.database();
        seed(&path, 1); // Newly created storage uses WAL, allowing this real writer.
        let mut reader = open_existing(&path).unwrap().unwrap();
        let tx = reader.transaction().unwrap();
        assert_eq!(read_row(&tx, &path, "main").unwrap().unwrap(), main_state(1)); // pin snapshot
        let mut writer = open_for_write(&path).unwrap();
        let write = writer.transaction().unwrap();
        for (key, raw) in [("main", main_state(2)), ("certificates", certificates(2)), ("bank", bank(2))] {
            write.execute("UPDATE app_state SET value=?1 WHERE key=?2", params![raw, key]).unwrap();
        }
        write.commit().unwrap();
        let old = parse(backup_from_connection(&tx, &path).unwrap());
        assert_eq!(old["updatedAt"], 1);
        assert_eq!(old["bankEntries"][0]["amount"], 1);
        assert_eq!(old["certificateBranches"][0]["name"], "مركز 1");
        tx.commit().unwrap();
        let new = parse(read_backup(&path).unwrap());
        assert_eq!(new["updatedAt"], 2);
        assert_eq!(new["bankEntries"][0]["amount"], 2);
        assert_eq!(new["certificateBranches"][0]["name"], "مركز 2");
    }

    #[test]
    fn actual_sqlite_lock_reports_stage_path_and_busy_code_without_resetting_data() {
        let dir = TestDirectory::new();
        let path = dir.database();
        rollback_database(&path, &main_state(1));
        let locker = Connection::open(&path).unwrap();
        locker.execute_batch("BEGIN EXCLUSIVE").unwrap();
        let error = load_raw(&path, "main", validate_main_state).unwrap_err();
        assert!(error.contains("primary=5") && error.contains("extended=") && error.contains("قراءة الحالة main") && error.contains(path.to_str().unwrap()), "{error}");
        locker.execute_batch("ROLLBACK").unwrap();
        assert_eq!(load_raw(&path, "main", validate_main_state).unwrap().unwrap(), main_state(1));
    }

    #[test]
    fn ioerr_retains_its_extended_code_and_is_not_relabelled_busy() {
        let error = rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_IOERR_WRITE),
            Some("disk I/O error".to_string()),
        );
        let message = sqlite_error(Path::new("example.sqlite"), "اختبار الكتابة", error);
        assert!(message.contains("primary=10") && message.contains("extended=778"));
        assert!(!message.contains("primary=5"));
    }

    #[test]
    fn verified_atomic_backup_creates_and_replaces_a_valid_file() {
        let dir = TestDirectory::new();
        let target = dir.0.join("نسخة سليمة.json");
        atomic_write_backup(&target, &main_state(1)).unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), main_state(1));
        atomic_write_backup(&target, &main_state(2)).unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), main_state(2));
        dir.assert_no_temporary_files();
    }

    #[test]
    fn invalid_backup_and_partial_write_and_failed_verification_keep_previous_file() {
        let dir = TestDirectory::new();
        let target = dir.0.join("previous-good.json");
        let old = main_state(1);
        fs::write(&target, &old).unwrap();
        assert!(atomic_write_backup(&target, "{broken").is_err());
        let error = atomic_write_with(&target, &main_state(2), |file, bytes| {
            file.write_all(&bytes[..bytes.len()/2])?;
            Err(io::Error::new(io::ErrorKind::Other, "injected write failure after partial temporary write"))
        }).unwrap_err();
        assert!(error.contains("كتابة النسخة المؤقتة"));
        assert_eq!(fs::read_to_string(&target).unwrap(), old);
        let error = atomic_write_with(&target, &main_state(2), |file, _| file.write_all(old.as_bytes())).unwrap_err();
        assert!(error.contains("مقارنة النسخة المؤقتة"));
        assert_eq!(fs::read_to_string(&target).unwrap(), old);
        dir.assert_no_temporary_files();
    }

    #[cfg(windows)]
    #[test]
    fn windows_replace_failure_preserves_the_existing_good_backup() {
        use std::os::windows::fs::OpenOptionsExt;
        let dir = TestDirectory::new();
        let target = dir.0.join("previous-good.json");
        let old = main_state(1);
        fs::write(&target, &old).unwrap();
        // Permit reads, but deny delete sharing: Windows must refuse replacement.
        let lock = OpenOptions::new().read(true).share_mode(1).open(&target).unwrap();
        let error = atomic_write_backup(&target, &main_state(2)).unwrap_err();
        assert!(error.contains("استبدال الملف ذريًا") && error.contains("OS="), "{error}");
        assert_eq!(fs::read_to_string(&target).unwrap(), old);
        dir.assert_no_temporary_files();
        drop(lock);
    }
}
