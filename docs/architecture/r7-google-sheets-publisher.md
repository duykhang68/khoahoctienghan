# R7 — Google Sheets Publisher (candidate)

Stacked on R6 #210. Integrate R0–R6, reconcile current main before review. Concurrent Course Studio changes on main caused inherited conflicts in R2–R6; R7 does not overwrite or resolve unrelated changes.

Six pure modules in src/lib/sheet-blog/core/ for browser/private asset compatibility. Rows, routing, progress evidence, fingerprint input, reviewed identity and bounded receipt data have no I/O. sheets-client and queue-client own fetch; source shell owns SHA-256. Browser shells retain OAuth, localStorage, DOM, explicit consent, exact source reread, route check and publish. Original exports and read-only scope remain; no Sheet data/credential mutation, workflow, schedule, UI or FIFO policy change. Existing Sheets read/update race limitation remains.

Generator allowlists eight exact new keys. No auth changes. Four regression groups in existing suite; native sync --check, Node/Playwright CI and integrated review required. No production claim or measured tokenizer savings.
