# Independent reminder visibility and finance presentation — v67

Branch: `feature/efc-next-development`. Baseline: `f2ef906`.

## Source audit and accepted behavior

The final monthly reminder generator is the override in
`production-monthly-prepayment-domain-v14.js`. It emits a renewal warning three,
two and one day before renewal using the same kind, then a debt notice from the
renewal date onward. The base non-monthly debt reminder starts one day before
its configured due date. Inactive students produce no reminders. These source
rules and all amounts, payments, due dates and student state remain unchanged.

The user explicitly chose daily reappearance for overdue notices: hiding one
day's notice must not suppress the next overdue day. Visibility therefore
identifies the reminder instance by registration, obligation, stage/date and
amount rather than by student alone. Changing a name must not create a new
registration identity. Monthly obligations, different registrations and due-date
or balance changes must remain independent.

## Presentation changes

- Remove only the `الشهادات مستقلة` note from the income dashboard. Keep receipt
  headers, certificates, archives, permissions, error wording and accounting.
- Arrange the expense history course, general and aggregate amounts in three
  adjacent RTL columns at the same level. Preserve the existing element IDs,
  filtered rows/counts/aggregate, archive guard and branded PDF facilities.
- Add a separate dismiss control for each bell notification. It affects only
  the bell list/count; it does not hide the student's reminder or settle debt.
- In the student file, offer hiding only after that specific visible reminder
  preview has loaded and then closed. Downloading a PDF directly is insufficient;
  exporting after opening the preview remains optional. A preview's identity is
  captured when opened, so crossing midnight does not authorize a later notice.
- Preserve independent bell-hidden, profile-hidden and preview-viewed records
  across restart and backup/restore. No reminder hiding deletes source records,
  changes debt, stops/reactivates a student or changes reminder schedules.

## Persistence and validation

The reminder visibility module loads after login and before the foundation and
its startup contributors. Its optional `reminderVisibilityV67` snapshot is kept
separate from financial records, uses the v66 storage safeguards, and participates
in central snapshot/restore. A native read failure must not replace unknown saved
visibility data with an empty cache.

Dedicated source and packaged-browser tests cover canonical 3/2/1/day-of/overdue
progression; per-day overdue reappearance; independent bell/profile dismissal;
preview-close eligibility and direct-PDF exclusion; student/obligation separation;
restart/restore; unchanged source amounts and states; three-column geometry; and
unchanged expense filters, totals, reports and fiscal guards. Existing storage,
restore, bank, certificates, finance/PDF and Windows native tests remain required.

License v3 is unchanged. No device scheduling, activation v4, or reminder timing
policy beyond the requested independent daily visibility is introduced.
