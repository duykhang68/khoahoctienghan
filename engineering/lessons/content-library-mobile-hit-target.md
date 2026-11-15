# Candidate lesson — mobile Content Library action hit targets

PR #131, failed [run 43654582766](https://github.com/duykhang68/khoahoctienghan/actions/runs/43654582766), job 132630201514, HEAD 11f03f97b432b26dd551a38f2f07a6cfceba5706.

The Worker syntax repair passed 11/11 tests, build and static smoke. Desktop library regression passed; mobile Chromium timed out clicking #lib-delete because the confirmation label and slug input intercepted pointer events. 111/112 browser tests passed. This is a mobile hit-target/layout defect; no test timeout increase or forced click.

Repair: explicit grid flow for the edit panel and full-width action buttons, separate deletion zone, stable status region, bounded widths, touch targets and release focus from the input on submission. Keep actual user-like click assertions and check horizontal overflow. Reference: https://playwright.dev/docs/actionability . Candidate until native CI verifies a new exact HEAD.
