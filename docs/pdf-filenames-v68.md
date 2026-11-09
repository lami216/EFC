# Individual PDF filenames — v68

Branch: `feature/efc-next-development`. Baseline: `30b1c2e`.

The user requested the student's name, branch and registration number in every
individual student/certificate PDF filename. The existing receipt bodies already
identify these people; this change concerns filenames and print document titles.

## One naming facility

`EFC_PERSON_PDF_FILE_NAME_V68` lives in the canonical receipt service, which loads
before certificates. It produces readable Arabic names such as
`روسي-محمد أحمد-فرع عرفات-تسجيل 0042-وصل 0012.pdf` and
`شهادة-محمد أحمد-فرع عرفات-تسجيل 0042-وصل 00012.pdf`.

Student registration, later payment, exact-clone monthly receipt, derived monthly
receipt and full statement all use the displayed receipt model. Certificate and
delivery receipts use the issued record's student name/registration number and
the same branch resolver as their visible document, including its saved fallback
for deleted branches. The certificate delivery prefix remains distinct.

The helper retains leading registration zeros, converts Arabic/Persian digits,
removes Windows-invalid/control/bidirectional-formatting characters, and reserves
space for every field rather than truncating the registration/branch off the end.
Its field limits keep the full filename below 255 UTF-16 units without leaving a
trailing high surrogate. Missing legacy identity fields are labeled explicitly;
no registration number or source data is fabricated.

Native Save As, browser Save As and download share each generated name. Individual
document titles use the same stem so Print / Save as PDF has a matching suggested
name; the operating system still controls its print dialog and users may rename
files. Multi-student certificate period reports retain their period filenames.

## Scope and verification

Receipt layout/branding, amounts, transaction identities, archive/permission
guards, license v3 and student states are unchanged. No database migration,
device scheduling or activation v4 is introduced.

Dedicated source and packaged-browser regressions cover filename sanitization,
all individual receipt kinds, internal/external/legacy certificate branches,
print titles, save transports, actual PDF generation and unchanged source state.
Existing finance, restore, bank, reminder, storage and Windows build/startup
checks remain required.
