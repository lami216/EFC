# Finance history and registration partitions

Target: `feature/efc-next-development`. Audited baseline:
`5acee84cc1597780547d10515b2a87a608061e7a`.

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
  counts distinct earlier registrations with a canonical payment in the period.
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
