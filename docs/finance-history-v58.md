# Finance history and registration partitions (v58/v59/v60)

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
- The existing registration-date resolver prefers `registeredAt`, then
  `registrationDate`, then the original creation timestamp in a native student ID;
  legacy records without these fall back to `start`. Payment date controls period
  inclusion, while registration date controls new/earlier classification. No date
  is inferred from the installment/month being paid.
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
