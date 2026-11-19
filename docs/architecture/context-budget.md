# R0 — Context baseline và phương pháp benchmark

> Bản số liệu R0 là ảnh chụp lịch sử. Course Studio P2 đã được gỡ; các tên file course/curriculum bên dưới chỉ phục vụ đối chiếu baseline cũ, không còn là đường dẫn module đang hoạt động. Benchmark hiện hành xem `context-benchmark.json`.

Baseline main: 3e5e7a966a5c528cccbb920d48e435ebf93a04bd; Git tree 05820f57b159407de3ba289376846b3b3e35ac5c, recursive, không truncated. 291 tracked blobs và 1 gitlink editor-original (không đo bên trong submodule). Đơn vị byte UTF-8/blob size (1 KB = 1000 bytes). Snapshot code audit trước đó là 3ff572ab2cd5563634b8de5ab49b74a4071d86ab; worker tăng từ 337866 lên 348561 byte.

## Baseline đã đo từ Git tree
| File | Bytes |
| --- | ---: |
| back-office/worker.mjs | 348561 |
| src/lib/editor-v2/browser.mjs | 27864 |
| scripts/engineering-controller.mjs | 19443 |
| editor/apps/web/src/App.jsx | 16574 |
| back-office/server-scheduler.mjs | 15736 |
| scripts/editor-v2-queue.mjs | 12820 |
| src/lib/sheet-blog/browser.mjs | 12536 |
| src/lib/editor-v2/revision.mjs | 11130 |
| src/lib/editor-v2/model.mjs | 10275 |
| src/lib/editor-v2/drafts-browser.mjs | 9173 |
| back-office/worker.test.mjs | 42841 |
| back-office/course-integration.test.mjs | 4753 |

Worker content fetched has 639 lines (including final empty line); two generated bundle lines contain 67441 + 110727 = 178168 JS string code units, out of 336460 code units (~53.0%). Code-unit count is not UTF-8 bytes or tokens. Remaining worker size after extraction must be measured at R1. A 4 byte/token ratio is illustrative only, not measured usage.

## Fixed task apertures (source + test, selected file set, not exhaustive dependency closure)
| Task | Baseline set | Bytes | Proposed source+test target |
| --- | --- | ---: | --- |
| Curriculum version/409 | worker.mjs + back-office/worker.test.mjs + tests/e2e/curriculum-save.spec.ts | 395959 | 10–25 KB |
| Editorial rich text | src/lib/editor-v2/model.mjs + browser.mjs + tests/e2e/editor-v2.spec.ts | 46433 | 6–15 KB |
| CI failure decision | scripts/engineering-controller.mjs + engineering-policy.mjs + tests/engineering.test.mjs | 29044 | 6–12 KB |
| FIFO transition | scripts/editor-v2-queue.mjs + editor-v2-queue-policy.mjs + tests/editor-v2-queue.test.mjs | 22289 | 6–12 KB |
| Scheduler retry | back-office/server-scheduler.mjs + server-scheduler.test.mjs | 24556 | 6–12 KB |
| Sheets row selection | src/lib/sheet-blog/model.mjs + browser.mjs + tests/e2e/sheet-blog.spec.ts | 27654 | 6–14 KB |

Task sets intentionally approximate a full-file reading strategy; not agent telemetry or minimum needed context. Targets are proposals, not pass results. Shared AGENTS.md and this map are excluded from both source+test totals; report them separately in actual benchmark. Benchmark must include dependency expansion when necessary and must never trade correctness/security for small context.

## Reproduce baseline
In a local clone, git ls-tree -r -l 3e5e7a966a5c528cccbb920d48e435ebf93a04bd lists Git object sizes (gitlinks have no blob size). For each task sum only unique selected paths. For generated markers inspect source with a script, count UTF-8 bytes separately using Buffer.byteLength. For subsequent phases repeat at exact tested SHA, record new path list, bytes, characterization-test results, review notes.
For token benchmark at R10: pin model/tokenizer implementation/version, same task prompt, same file order, same inclusion of shared instructions/test excerpts, count serialized input tokens with the same tokenizer. Report median and range across fixed tasks, separately report total model input including overhead if available. Never claim actual cost or token savings from bytes alone.

Guidelines (not gates): pure modules 50–150 LOC or ~2–8 KB, shell 100–250 LOC; worker entrypoint <100 LOC when practical. Prefer cohesive modules to tiny fragments; avoid minifying code to satisfy budgets. Exclude generated assets from ordinary context, but include in asset/security tasks.

## Verification baseline
Observed native main CI run [43677374428](https://github.com/duykhang68/khoahoctienghan/actions/runs/43677374428) success and public CD run [43677488888](https://github.com/duykhang68/khoahoctienghan/actions/runs/43677488888) success for baseline SHA. These run summaries do not establish private Worker deployment/UAT or independent route verification. Fresh test execution, numeric coverage, complete dependency/cycle analysis and tokenizer benchmark: not performed in R0 authoring environment; record later with commands and evidence. R0 changes only documentation; PR native CI remains required.
