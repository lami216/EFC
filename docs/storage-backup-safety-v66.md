# Storage and backup safety — v66

Branch: `feature/efc-next-development`. Baseline: `db91640`.

## Observed incident and limits of diagnosis

The reported older installer displayed `تعذر تهيئة قاعدة البيانات: disk I/O
error` when backing up on exit. The user subsequently reported normal operation,
no observed missing data, and a successful backup to a USB drive.

The older and baseline native storage/close paths are identical. The error is
from SQLite connection initialization, before writing the selected backup file.
It can originate in the pre-export save or the database reads used by export.
The old no-backup close bypasses both operations. Isolated injected-error tests
reproduce these control-flow outcomes; they do not establish the operating-system
or hardware cause on the customer's computer. IOERR is not proof of corruption,
disk failure, or a concurrency bug.

## Scope of the fix

- Separate existing-database reads from writable initialization. Reading a
  backup must not create an empty replacement database or execute schema/WAL
  initialization. Preserve the existing SQLite filename, keys and JSON format.
- Include the operation, actual path and SQLite primary/extended code in storage
  failures. Preserve failures rather than retrying indefinitely or disguising
  them as successful saves.
- Flush all registered native state sections before creating the main snapshot.
  Closing without an external backup must still wait for successful persistence.
  Failure or Save As cancellation leaves the application open.
  At login, no operational snapshot is written before its contributors load:
  no-backup exit validates existing native records, while external backup asks
  the user to finish login so it can include the latest cached changes.
- Surface background-save failures with an inline storage status and an explicit
  retry. Failed native hydration must not automatically overwrite unknown native
  data with empty or older cached data. Preserve the cache for recovery.
- Read main, certificate and bank data in one consistent SQLite snapshot. Reject
  malformed sections instead of silently replacing them with empty arrays, and
  preserve legacy inline sections when independent rows are absent.
  Native auxiliary loads recover these inline sections before the first startup
  save; an early main save also retains absent legacy auxiliary fields until
  independent rows exist. Explicit values are never replaced by this retention.
- Write a backup to a unique sibling temporary file, flush and sync it, verify
  its contents, then publish it by rename. A failed replacement must leave a
  previous good backup intact. Apply the same writer to pre-restore safety files.

The changes do not alter finance filters, payment allocation, student identity,
receipt numbers, license v3, or the restore merge policy. No automatic database
repair, deletion of SQLite sidecar files, device scheduling or activation v4 is
introduced. An inaccessible or physically failing drive still requires diagnosis;
this update cannot guarantee against hardware failure.

## Validation

`verify-storage-safety-v66.mjs` exercises the actual loader and close controller
with isolated native failures, pending writes, recovery and rejected background
saves. `test-storage-safety-v66.mjs` exercises the packaged UI with a mock native
bridge, separate browser profiles and synthetic data. Native `storage` unit tests
exercise real temporary SQLite files and verified-file replacement on Windows.
Existing source, monthly, restore, certificate, bank, finance/PDF and expense
regressions remain required before the installer and Windows startup smoke test.

No customer files are opened, repaired or changed by these tests. Tests of
simulated failures and filesystem replacement do not reproduce every possible
USB disconnection, power loss, disk controller or antivirus failure.
