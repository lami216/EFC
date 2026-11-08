# Expense labels and filtered history summary — v65

Branch: `feature/efc-next-development`. Baseline: `b848afa`.

## Source audit

`production-finance-ui-v13.js` owns the expense dashboard, history, and shared
branded history PDF renderer. `production-domain-v13.js` owns `expenseMatches`:
it already applies exact branch/course/date matches. The expense history table
and its export already share the same selected rows, with the existing today
cutoff, order, full-result pagination, and fiscal archive guard.

The dashboard deliberately shows general expenses for the selected branch/date
independently of its course filter. This is distinct from a history export for a
specific course, which must exclude general expenses. No domain predicate,
source records, income, debt, payment, or profitability calculations are changed.

## Changes

- The expense dashboard labels the course portion of both existing cards with
  the selected course name. Names are escaped and can wrap without truncation.
- The existing expense history summary now shows course and general amounts and
  operation counts side by side, followed by their unchanged aggregate.
- All values use the very same filtered rows as the table and export. Selecting
  a course produces zero general expenses; a branch without a course includes
  that branch's general expenses and all its courses. Branch plus course is their
  intersection. The explicit general-only option is retained. The unfiltered
  option is labeled `كل المصاريف` to describe its actual scope.
- Closed and mixed fiscal periods mask every new subtotal and count, as well as
  the existing aggregate, and continue to block preview/print/PDF export.
- The existing EFC header, first-page-only metadata, continuation pages, and
  canonical PDF/print/save facilities remain in use.

## Validation

The dedicated source and packaged-browser regressions cover branch/course/date
intersections, general-only and empty results, partition reconciliation, source
immutability, dashboard independence, fiscal guards, and the full filtered
preview/PDF. Existing finance, receipt, monthly, restore, certificate, bank, and
license checks remain required. Windows CI runs the new regressions before
building and smoke-testing the installer. License v3 and student lifecycle are
unchanged; no device scheduling or activation v4 is introduced.
