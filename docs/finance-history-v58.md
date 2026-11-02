# Finance history and registration partitions (v58/v59/v60/v61/v62)

Target: `feature/efc-next-development`. Audited baseline:
`5acee84cc1597780547d10515b2a87a608061e7a`.
The v59 feedback refinement starts from
`ca087f4582aec6e3ad83e896672b91c9e64083ed`.

## Source audit and scope

- `production-foundation-v13.js` owns `allPayments`; accounting integrity v21
  supplies the canonical historical branch/course scope. The dashboard and income
  history still consume that stream. Certificate receipts are a **separate**
  stream in this branch, explicitly excluded from the dashboard total. The income
  card now says so. If a canonical row is marked as certificate income, the
  partition accounts for it separately instead of classifying its synthetic
  student as a registration.
- `production-finance-ui-v13.js` already owns the three separate renderers:
  finance dashboard, income history and expense history. Only the dashboard's two
  existing cards receive partitions. Histories retain their existing summary and
  actions and add one shared export control beside the heading.
- Since v62, the finance registration-date resolver uses the date of the first
  positive source payment: the original registration receipt. Source array order
  is retained, matching the existing receipt editor; sorting by payment date
  would incorrectly promote later backdated collections into registrations.
  Until a student pays, `start` keeps unpaid registrations visible. Creation
  metadata (`registeredAt`, `registrationDate`, native ID timestamps) is no longer
  used for finance cohorts. Each actual payment date still determines the period
  containing its amount. No date is inferred from the installment being paid.
- Student counts use `recordCode` (or legacy `id`) once per group. The first count
  includes all matching new registrations, including unpaid ones. The second
  counts distinct earlier registrations with a positive canonical payment in the
  period **and no remaining balance through its effective end**. Partial payers
  and students settled only by future receipts are excluded from this count.
  Payment amounts retain every real transaction. New + earlier + explicitly
  separate certificate + unclassified amounts always reconcile to the unchanged
  aggregate. Missing or later registration dates appear as unclassified income.
- The debt total, profitability, expense predicates, payment allocation, student
  lifecycle, registration editor and persistence model remain authoritative.

## v62: registration follows its source payment

Confirmed on the previous build: a native November file with an October start
and October registration receipt was counted as a November registration; its
October income appeared as unclassified. Finance used creation metadata while
period-search registrations used the course start. The approved correction is
limited to finance: its registration month follows the original payment date;
period search intentionally continues to filter by `start`.

The resolver reads existing canonical records on every draw. Existing installed
and restored data therefore receive the correction immediately, without a
migration, new registration, rewritten receipt, changed ID or altered balance.
Moving the original receipt from October to November (or back) moves the finance
registration count and new/earlier income classification. Later collections
retain the original cohort, even when their dates are edited before the original
receipt date. Canonical transaction amounts, payment-period filters, fiscal locks,
certificate separation, the earlier fully settled count and report layout stay
unchanged. A later backdated collection can still correctly remain unclassified
when its registration receipt lies after the selected period; this is not the
creation-date bug and no source dates are silently repaired.

Validation: `npm run check` includes runtime-helper cases for existing metadata,
receipt date corrections, later backdated collections, unpaid/missing-date
fallbacks, future creation timestamps, cohort filter matrices and reconciliation.
`scripts/test-finance-registration-date-v62.mjs` runs the full packaged app and
edits actual original receipts through their UI. It verifies monthly/day/range/
year and branch/course filters, unchanged start-based search, startup correction,
round-trip date changes, personal-data start edits, repeated backup restore,
legacy imports lacking an ID, unpaid-to-paid transitions and stopped students.
`scripts/test-finance-history-v58.mjs` retains the full report/PDF/native-save,
responsive layout and closed/mixed fiscal regression checks plus the supplied
realistic backup (30 new, 41 earlier settled, 179400 income and 53400 debt).

## Reports and fiscal guard

Both exports snapshot **all** rows already selected and sorted by the visible
table, not its scroll viewport. The report includes the selected period, actual
today cutoff, branch, course, operation count and aggregate total. It reuses the
expense receipt header, embedded logo/contact icons, existing receipt viewer,
offline html2canvas/jsPDF libraries and licensed `save_receipt_pdf` Save As bridge.
Reports have no source edit/delete controls or numbered-receipt identity.

Pagination measures wrapped rows on landscape A4 pages. Each page repeats the
branding, filters, column headers, **whole-report** total and page number. A single
oversized description continues without dropping text; its amount appears once.
Print uses the same pages and explicit page breaks. PDF captures one page at a
time, avoiding a large canvas and arbitrary slicing through rows.

Closed/mixed ranges use the existing accounting archive notice, hide incomplete
live totals and disable export. Preview, print and save each recheck the range.
The accounting weekly guard now reads the actual normalized from/to range,
including a blank beginning, instead of substituting a calendar year.

## Validation

- `npm run check`: existing regression suite plus behavioral partition/report
  tests in `scripts/verify-finance-history-v58.mjs`.
- `npm run build`: packaged offline runtime.
- `node scripts/test-finance-history-v58.mjs`: real browser integration; install
  Playwright locally first. `EFC_PLAYWRIGHT_MODULE` may point to its `index.mjs`;
  `EFC_BROWSER_PATH` may point to an existing Chrome/Chromium executable.
  `EFC_QA_OUTPUT` optionally writes screenshots and generated PDF files.
- Browser coverage: branch/course/day/month/year filters; reversed and blank
  custom ranges; unpaid new and stopped earlier students; distinct counts;
  separate certificate accounting; general expenses; empty results; complete
  long results; oversized text continuation; native save cancellation; PDF page
  counts; print page counts; immutable open previews; 1440/1024/840 layouts; and
  closed/mixed/open fiscal transitions, including the weekly guard.
- Windows workflow now also runs on pushes to the target development branch. It
  runs the full checks and builds the NSIS installer and startup smoke test.

The runtime cache token is advanced in the loader gate and index together. License
v3 keys/validation, device scheduling and canceled-student state are unchanged.

## v59 user feedback

The student card shows new registrations once at the top and fully settled earlier
payers beneath it. Short labels replace the longer explanatory titles. The income
card now orders `دخل الجدد`, `دخل السابقين`, then `الإجمالي`; the existing aggregate
is retained at the bottom. Income still includes actual partial payments even
though their students are excluded from the fully settled count. Settlement reads
the canonical remaining-balance function with a copy containing receipts through
the selected effective end; source payments and balances are never edited.

The approved EFC header stays unchanged. Below it, each report page shows a
prominent title: red for expenses, green for income. Labeled fields show from/to
dates, extraction date and time, branch, course and the data cutoff. The extraction
timestamp is captured once when opening the report and remains identical across
preview, all pages, print and PDF save. Pagination still measures all added content.

The supplied demo backup remains valid. On November 1 it contains 48 earlier
students who paid, **41 fully settled earlier payers**, and 30 new registrations.
The fully settled branch counts are 14 / 13 / 14. The earlier v58 demo guide's 48
describes all earlier payers. Income remains 72,900 + 106,500 = 179,400 MRU and
current debt remains 53,400 MRU. Browser coverage restores this real fixture and
verifies these values, both stopped students, and the branch filters.

## v60 horizontal dashboard presentation

Only the income dashboard presentation changes: each existing income/student
card has two equal RTL columns, new registrations on the right and earlier
registrations on the left. The income aggregate remains in a full-width row below
both halves. The student card shows its two existing counts once each, without a
combined student total. The settled-payer rule and all amounts remain unchanged.

The report renderer/styles, receipt header, history pages, filters, debt and
profit calculations are unchanged. Geometry checks verify the side-by-side cells,
equal widths, readable values and total placement at 1440, 1024 and 840 pixels.

## v61 compact history exports

The EFC header, colored report title and labeled date/filter fields now appear
only on the first page. Continuation pages start with the table column headings;
every page retains its small footer and page number. The unchanged whole-report
aggregate appears once, at the end of the final page.

Metadata boxes and table padding are smaller, with darker borders. Arabic table
text remains 11px. Pagination measures the available space separately for the
first and continuation pages and reserves the aggregate only for the final row.
Oversized descriptions still continue without losing characters or duplicating
amounts. Preview, print and saved PDF use the same page structure. Dashboard
presentation, accounting, filters and fiscal/archive guards remain unchanged.
